package controllers

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"logistics-backend/database"
	"logistics-backend/models"
	"logistics-backend/utils"
)

// generateTrackingNumber 生成运单号
func generateTrackingNumber() string {
	// 格式: SF + 年月日 + 8位随机数
	now := time.Now()
	return fmt.Sprintf("SF%s%08d", now.Format("20060102"), time.Now().Nanosecond()/100000)
}

// GetPackageList 获取快递列表
func GetPackageList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	status := c.Query("status")
	keyword := c.Query("keyword")
	userRole := c.GetString("role")
	userID := c.GetUint("user_id")

	var packages []models.Package
	var total int64

	query := database.DB.Model(&models.Package{})

	// 普通用户只能看到自己的快递
	if userRole == models.RoleUser {
		query = query.Where("sender_user_id = ? OR receiver_user_id = ?", userID, userID)
	}

	// 员工只能看到自己站点的快递
	if userRole == models.RoleEmployee {
		// 获取员工所在站点
		var employee models.User
		if err := database.DB.First(&employee, userID).Error; err == nil && employee.SiteID != nil {
			query = query.Where("current_site_id = ?", *employee.SiteID)
		}
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if keyword != "" {
		query = query.Where("tracking_number LIKE ? OR sender_name LIKE ? OR receiver_name LIKE ?", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}

	query.Count(&total)

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&packages).Error; err != nil {
		utils.InternalError(c, "获取快递列表失败")
		return
	}

	utils.Success(c, gin.H{
		"list":      packages,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// GetPackageByID 获取快递详情
func GetPackageByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var pkg models.Package
	if err := database.DB.First(&pkg, id).Error; err != nil {
		utils.NotFound(c, "快递不存在")
		return
	}

	// 获取轨迹
	var tracks []models.PackageTrack
	database.DB.Where("package_id = ?", id).Order("created_at ASC").Find(&tracks)

	utils.Success(c, gin.H{
		"package": pkg,
		"tracks":  tracks,
	})
}

// GetPackageByTrackingNumber 通过运单号查询
func GetPackageByTrackingNumber(c *gin.Context) {
	trackingNumber := c.Param("tracking_number")

	var pkg models.Package
	if err := database.DB.Where("tracking_number = ?", trackingNumber).First(&pkg).Error; err != nil {
		utils.NotFound(c, "快递不存在")
		return
	}

	// 获取轨迹
	var tracks []models.PackageTrack
	database.DB.Where("package_id = ?", pkg.ID).Order("created_at ASC").Find(&tracks)

	utils.Success(c, gin.H{
		"package": pkg,
		"tracks":  tracks,
	})
}

// CreatePackage 创建快递（寄件）
func CreatePackage(c *gin.Context) {
	var req struct {
		SenderName      string  `json:"sender_name" binding:"required"`
		SenderPhone     string  `json:"sender_phone" binding:"required"`
		SenderAddress   string  `json:"sender_address" binding:"required"`
		ReceiverName    string  `json:"receiver_name" binding:"required"`
		ReceiverPhone   string  `json:"receiver_phone" binding:"required"`
		ReceiverAddress string  `json:"receiver_address" binding:"required"`
		GoodsName       string  `json:"goods_name"`
		GoodsWeight     float64 `json:"goods_weight"`
		GoodsValue      float64 `json:"goods_value"`
		FromSiteID      *uint   `json:"from_site_id"`
		ToSiteID        *uint   `json:"to_site_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	// 计算运费（简单计算：每公斤10元，最低10元）
	shippingFee := req.GoodsWeight * 10
	if shippingFee < 10 {
		shippingFee = 10
	}

	userID := c.GetUint("user_id")
	userRole := c.GetString("role")

	pkg := models.Package{
		TrackingNumber:  generateTrackingNumber(),
		SenderName:      req.SenderName,
		SenderPhone:     req.SenderPhone,
		SenderAddress:   req.SenderAddress,
		ReceiverName:    req.ReceiverName,
		ReceiverPhone:   req.ReceiverPhone,
		ReceiverAddress: req.ReceiverAddress,
		GoodsName:       req.GoodsName,
		GoodsWeight:     req.GoodsWeight,
		GoodsValue:      req.GoodsValue,
		ShippingFee:     shippingFee,
		Status:          models.PackageStatusPending,
		FromSiteID:      req.FromSiteID,
		ToSiteID:        req.ToSiteID,
		PaymentStatus:   0,
	}

	// 如果是用户寄件，记录用户ID
	if userRole == models.RoleUser {
		pkg.SenderUserID = &userID
	}

	if err := database.DB.Create(&pkg).Error; err != nil {
		utils.InternalError(c, "创建快递失败")
		return
	}

	// 添加轨迹
	addPackageTrack(pkg.ID, models.PackageStatusPending, "快递已创建，待处理", "", c.GetString("username"))

	logOperation(c, userID, c.GetString("username"), userRole, "快递管理", "寄件", "创建快递运单号: "+pkg.TrackingNumber)
	utils.SuccessWithMessage(c, "寄件成功", pkg)
}

// UpdatePackage 更新快递
func UpdatePackage(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var req struct {
		SenderName      string  `json:"sender_name"`
		SenderPhone     string  `json:"sender_phone"`
		SenderAddress   string  `json:"sender_address"`
		ReceiverName    string  `json:"receiver_name"`
		ReceiverPhone   string  `json:"receiver_phone"`
		ReceiverAddress string  `json:"receiver_address"`
		GoodsName       string  `json:"goods_name"`
		GoodsWeight     float64 `json:"goods_weight"`
		GoodsValue      float64 `json:"goods_value"`
		CurrentSiteID   *uint   `json:"current_site_id"`
		FromSiteID      *uint   `json:"from_site_id"`
		ToSiteID        *uint   `json:"to_site_id"`
		EmployeeID      *uint   `json:"employee_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var pkg models.Package
	if err := database.DB.First(&pkg, id).Error; err != nil {
		utils.NotFound(c, "快递不存在")
		return
	}

	updates := map[string]interface{}{}
	if req.SenderName != "" {
		updates["sender_name"] = req.SenderName
	}
	if req.SenderPhone != "" {
		updates["sender_phone"] = req.SenderPhone
	}
	if req.SenderAddress != "" {
		updates["sender_address"] = req.SenderAddress
	}
	if req.ReceiverName != "" {
		updates["receiver_name"] = req.ReceiverName
	}
	if req.ReceiverPhone != "" {
		updates["receiver_phone"] = req.ReceiverPhone
	}
	if req.ReceiverAddress != "" {
		updates["receiver_address"] = req.ReceiverAddress
	}
	if req.GoodsName != "" {
		updates["goods_name"] = req.GoodsName
	}
	if req.GoodsWeight > 0 {
		updates["goods_weight"] = req.GoodsWeight
	}
	if req.GoodsValue > 0 {
		updates["goods_value"] = req.GoodsValue
	}
	if req.CurrentSiteID != nil {
		updates["current_site_id"] = req.CurrentSiteID
	}
	if req.FromSiteID != nil {
		updates["from_site_id"] = req.FromSiteID
	}
	if req.ToSiteID != nil {
		updates["to_site_id"] = req.ToSiteID
	}
	if req.EmployeeID != nil {
		updates["employee_id"] = req.EmployeeID
	}

	if err := database.DB.Model(&pkg).Updates(updates).Error; err != nil {
		utils.InternalError(c, "更新快递失败")
		return
	}

	logOperation(c, c.GetUint("user_id"), c.GetString("username"), c.GetString("role"), "快递管理", "更新", "更新快递运单号: "+pkg.TrackingNumber)
	utils.SuccessWithMessage(c, "更新成功", pkg)
}

// DeletePackage 删除快递
func DeletePackage(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var pkg models.Package
	if err := database.DB.First(&pkg, id).Error; err != nil {
		utils.NotFound(c, "快递不存在")
		return
	}

	// 只有待处理状态的快递可以删除
	if pkg.Status != models.PackageStatusPending {
		utils.BadRequest(c, "只有待处理状态的快递可以删除")
		return
	}

	if err := database.DB.Delete(&pkg).Error; err != nil {
		utils.InternalError(c, "删除快递失败")
		return
	}

	logOperation(c, c.GetUint("user_id"), c.GetString("username"), c.GetString("role"), "快递管理", "删除", "删除快递运单号: "+pkg.TrackingNumber)
	utils.SuccessWithMessage(c, "删除成功", nil)
}

// InboundPackage 快递入库
func InboundPackage(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var req struct {
		SiteID uint `json:"site_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var pkg models.Package
	if err := database.DB.First(&pkg, id).Error; err != nil {
		utils.NotFound(c, "快递不存在")
		return
	}

	now := time.Now()
	pkg.Status = models.PackageStatusArrived
	pkg.CurrentSiteID = &req.SiteID
	pkg.InboundTime = &now

	if err := database.DB.Save(&pkg).Error; err != nil {
		utils.InternalError(c, "入库失败")
		return
	}

	// 添加轨迹
	var siteName string
	var site models.Site
	if err := database.DB.First(&site, req.SiteID).Error; err == nil {
		siteName = site.Name
	}
	addPackageTrack(pkg.ID, models.PackageStatusArrived, "快递已到达站点", siteName, c.GetString("username"))

	logOperation(c, c.GetUint("user_id"), c.GetString("username"), c.GetString("role"), "快递管理", "入库", "快递入库: "+pkg.TrackingNumber)
	utils.SuccessWithMessage(c, "入库成功", pkg)
}

// OutboundPackage 商品出库
func OutboundPackage(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var pkg models.Package
	if err := database.DB.First(&pkg, id).Error; err != nil {
		utils.NotFound(c, "快递不存在")
		return
	}

	now := time.Now()
	pkg.Status = models.PackageStatusInTransit
	pkg.OutboundTime = &now

	if err := database.DB.Save(&pkg).Error; err != nil {
		utils.InternalError(c, "出库失败")
		return
	}

	// 添加轨迹
	addPackageTrack(pkg.ID, models.PackageStatusInTransit, "快递已出库，开始运输", "", c.GetString("username"))

	logOperation(c, c.GetUint("user_id"), c.GetString("username"), c.GetString("role"), "快递管理", "出库", "快递出库: "+pkg.TrackingNumber)
	utils.SuccessWithMessage(c, "出库成功", pkg)
}

// DeliverPackage 快递派送
func DeliverPackage(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var req struct {
		EmployeeID uint `json:"employee_id"`
	}

	c.ShouldBindJSON(&req)

	var pkg models.Package
	if err := database.DB.First(&pkg, id).Error; err != nil {
		utils.NotFound(c, "快递不存在")
		return
	}

	pkg.Status = models.PackageStatusDelivering
	if req.EmployeeID > 0 {
		pkg.EmployeeID = &req.EmployeeID
	}

	if err := database.DB.Save(&pkg).Error; err != nil {
		utils.InternalError(c, "派送失败")
		return
	}

	// 添加轨迹
	addPackageTrack(pkg.ID, models.PackageStatusDelivering, "快递正在派送中", "", c.GetString("username"))

	logOperation(c, c.GetUint("user_id"), c.GetString("username"), c.GetString("role"), "快递管理", "派送", "快递派送: "+pkg.TrackingNumber)
	utils.SuccessWithMessage(c, "派送成功", pkg)
}

// SignPackage 签收快递
func SignPackage(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var pkg models.Package
	if err := database.DB.First(&pkg, id).Error; err != nil {
		utils.NotFound(c, "快递不存在")
		return
	}

	now := time.Now()
	pkg.Status = models.PackageStatusSigned
	pkg.SignTime = &now

	if err := database.DB.Save(&pkg).Error; err != nil {
		utils.InternalError(c, "签收失败")
		return
	}

	// 添加轨迹
	addPackageTrack(pkg.ID, models.PackageStatusSigned, "快递已签收", "", c.GetString("username"))

	logOperation(c, c.GetUint("user_id"), c.GetString("username"), c.GetString("role"), "快递管理", "签收", "快递签收: "+pkg.TrackingNumber)
	utils.SuccessWithMessage(c, "签收成功", pkg)
}

// PickupPackage 取件
func PickupPackage(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var pkg models.Package
	if err := database.DB.First(&pkg, id).Error; err != nil {
		utils.NotFound(c, "快递不存在")
		return
	}

	now := time.Now()
	pkg.Status = models.PackageStatusPicked
	pkg.PickTime = &now

	if err := database.DB.Save(&pkg).Error; err != nil {
		utils.InternalError(c, "取件失败")
		return
	}

	// 添加轨迹
	addPackageTrack(pkg.ID, models.PackageStatusPicked, "快递已取件", "", c.GetString("username"))

	logOperation(c, c.GetUint("user_id"), c.GetString("username"), c.GetString("role"), "快递管理", "取件", "快递取件: "+pkg.TrackingNumber)
	utils.SuccessWithMessage(c, "取件成功", pkg)
}

// PayPackage 支付快递费用
func PayPackage(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var pkg models.Package
	if err := database.DB.First(&pkg, id).Error; err != nil {
		utils.NotFound(c, "快递不存在")
		return
	}

	if pkg.PaymentStatus == 1 {
		utils.BadRequest(c, "已支付，无需重复支付")
		return
	}

	now := time.Now()
	pkg.PaymentStatus = 1
	pkg.PaymentTime = &now
	// 支付后状态更新为已发货
	pkg.Status = models.PackageStatusShipped

	if err := database.DB.Save(&pkg).Error; err != nil {
		utils.InternalError(c, "支付失败")
		return
	}

	// 添加轨迹
	addPackageTrack(pkg.ID, models.PackageStatusShipped, "支付完成，快递已发货", "", c.GetString("username"))

	logOperation(c, c.GetUint("user_id"), c.GetString("username"), c.GetString("role"), "快递管理", "支付", "快递支付: "+pkg.TrackingNumber)
	utils.SuccessWithMessage(c, "支付成功", pkg)
}

// addPackageTrack 添加快递轨迹
func addPackageTrack(packageID uint, status, description, location, operator string) {
	track := models.PackageTrack{
		PackageID:   packageID,
		Status:      status,
		Description: description,
		Location:    location,
		Operator:    operator,
		CreatedAt:   time.Now(),
	}
	database.DB.Create(&track)
}

// GetStatistics 获取统计数据
func GetStatistics(c *gin.Context) {
	userRole := c.GetString("role")
	userID := c.GetUint("user_id")

	// 总快递数
	var totalPackages int64
	query := database.DB.Model(&models.Package{})
	if userRole == models.RoleUser {
		query = query.Where("sender_user_id = ? OR receiver_user_id = ?", userID, userID)
	}
	query.Count(&totalPackages)

	// 待处理
	var pendingCount int64
	database.DB.Model(&models.Package{}).Where("status = ?", models.PackageStatusPending).Count(&pendingCount)

	// 运输中
	var transitCount int64
	database.DB.Model(&models.Package{}).Where("status = ?", models.PackageStatusInTransit).Count(&transitCount)

	// 派送中
	var deliveringCount int64
	database.DB.Model(&models.Package{}).Where("status = ?", models.PackageStatusDelivering).Count(&deliveringCount)

	// 已签收
	var signedCount int64
	database.DB.Model(&models.Package{}).Where("status = ?", models.PackageStatusSigned).Count(&signedCount)

	// 今日新增
	today := time.Now().Format("2006-01-02")
	var todayCount int64
	database.DB.Model(&models.Package{}).Where("DATE(created_at) = ?", today).Count(&todayCount)

	utils.Success(c, gin.H{
		"total_packages":  totalPackages,
		"pending_count":   pendingCount,
		"transit_count":   transitCount,
		"delivering_count": deliveringCount,
		"signed_count":    signedCount,
		"today_count":     todayCount,
	})
}
