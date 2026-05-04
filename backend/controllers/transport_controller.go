package controllers

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"logistics-backend/database"
	"logistics-backend/models"
	"logistics-backend/utils"
)

// GetTransportList 获取运输列表
func GetTransportList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	status := c.Query("status")

	var transports []models.Transport
	var total int64

	query := database.DB.Model(&models.Transport{})

	if status != "" {
		query = query.Where("status = ?", status)
	}

	query.Count(&total)

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&transports).Error; err != nil {
		utils.InternalError(c, "获取运输列表失败")
		return
	}

	utils.Success(c, gin.H{
		"list":      transports,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// CreateTransport 创建运输
func CreateTransport(c *gin.Context) {
	var req struct {
		PackageID   uint   `json:"package_id" binding:"required"`
		FromSiteID  uint   `json:"from_site_id" binding:"required"`
		ToSiteID    uint   `json:"to_site_id" binding:"required"`
		EmployeeID  *uint  `json:"employee_id"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	// 检查快递是否存在
	var pkg models.Package
	if err := database.DB.First(&pkg, req.PackageID).Error; err != nil {
		utils.NotFound(c, "快递不存在")
		return
	}

	transport := models.Transport{
		PackageID:   req.PackageID,
		FromSiteID:  req.FromSiteID,
		ToSiteID:    req.ToSiteID,
		EmployeeID:  req.EmployeeID,
		Description: req.Description,
		Status:      "in_transit",
	}

	now := time.Now()
	transport.StartTime = &now

	if err := database.DB.Create(&transport).Error; err != nil {
		utils.InternalError(c, "创建运输失败")
		return
	}

	// 更新快递状态
	pkg.Status = models.PackageStatusInTransit
	database.DB.Save(&pkg)

	// 添加快递轨迹
	addPackageTrack(pkg.ID, models.PackageStatusInTransit, "快递开始运输", "", c.GetString("username"))

	logOperation(c, c.GetUint("user_id"), c.GetString("username"), c.GetString("role"), "运输管理", "创建", "创建运输任务, 运单号: "+pkg.TrackingNumber)
	utils.SuccessWithMessage(c, "创建成功", transport)
}

// CompleteTransport 完成运输
func CompleteTransport(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var transport models.Transport
	if err := database.DB.First(&transport, id).Error; err != nil {
		utils.NotFound(c, "运输任务不存在")
		return
	}

	if transport.Status == "completed" {
		utils.BadRequest(c, "运输任务已完成")
		return
	}

	now := time.Now()
	transport.Status = "completed"
	transport.EndTime = &now

	if err := database.DB.Save(&transport).Error; err != nil {
		utils.InternalError(c, "完成运输失败")
		return
	}

	// 更新快递状态为已到达站点
	var pkg models.Package
	database.DB.First(&pkg, transport.PackageID)
	pkg.Status = models.PackageStatusArrived
	pkg.CurrentSiteID = &transport.ToSiteID
	pkg.InboundTime = &now
	database.DB.Save(&pkg)

	// 添加快递轨迹
	var siteName string
	var site models.Site
	if err := database.DB.First(&site, transport.ToSiteID).Error; err == nil {
		siteName = site.Name
	}
	addPackageTrack(pkg.ID, models.PackageStatusArrived, "快递已到达站点", siteName, c.GetString("username"))

	logOperation(c, c.GetUint("user_id"), c.GetString("username"), c.GetString("role"), "运输管理", "完成", "完成运输任务, 运单号: "+pkg.TrackingNumber)
	utils.SuccessWithMessage(c, "完成成功", transport)
}

// CheckInController 打卡控制器
// GetCheckInList 获取打卡列表
func GetCheckInList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	userID := c.Query("user_id")
	date := c.Query("date")

	var checkIns []models.CheckIn
	var total int64

	query := database.DB.Model(&models.CheckIn{})

	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	if date != "" {
		query = query.Where("date = ?", date)
	}

	query.Count(&total)

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&checkIns).Error; err != nil {
		utils.InternalError(c, "获取打卡列表失败")
		return
	}

	utils.Success(c, gin.H{
		"list":      checkIns,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// GetMyCheckInList 获取我的打卡记录
func GetMyCheckInList(c *gin.Context) {
	userID := c.GetUint("user_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	var checkIns []models.CheckIn
	var total int64

	query := database.DB.Model(&models.CheckIn{}).Where("user_id = ?", userID)
	query.Count(&total)

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&checkIns).Error; err != nil {
		utils.InternalError(c, "获取打卡记录失败")
		return
	}

	utils.Success(c, gin.H{
		"list":      checkIns,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// CheckIn 签到
func CheckIn(c *gin.Context) {
	userID := c.GetUint("user_id")
	today := time.Now().Format("2006-01-02")

	// 检查今天是否已签到
	var existingCheckIn models.CheckIn
	if err := database.DB.Where("user_id = ? AND date = ?", userID, today).First(&existingCheckIn).Error; err == nil {
		// 今天已有记录
		if existingCheckIn.Status >= 1 {
			utils.BadRequest(c, "今天已签到")
			return
		}
	}

	// 获取用户站点
	var user models.User
	database.DB.First(&user, userID)

	now := time.Now()
	checkIn := models.CheckIn{
		UserID:      userID,
		SiteID:      0,
		CheckInTime: &now,
		Date:        today,
		Status:      1,
	}

	if user.SiteID != nil {
		checkIn.SiteID = *user.SiteID
	}

	if existingCheckIn.ID > 0 {
		// 更新现有记录
		existingCheckIn.CheckInTime = &now
		existingCheckIn.Status = 1
		database.DB.Save(&existingCheckIn)
		checkIn = existingCheckIn
	} else {
		// 创建新记录
		database.DB.Create(&checkIn)
	}

	logOperation(c, userID, c.GetString("username"), c.GetString("role"), "打卡管理", "签到", "用户签到")
	utils.SuccessWithMessage(c, "签到成功", checkIn)
}

// CheckOut 签退
func CheckOut(c *gin.Context) {
	userID := c.GetUint("user_id")
	today := time.Now().Format("2006-01-02")

	// 检查今天是否已签到
	var existingCheckIn models.CheckIn
	if err := database.DB.Where("user_id = ? AND date = ?", userID, today).First(&existingCheckIn).Error; err != nil {
		utils.BadRequest(c, "今天未签到，无法签退")
		return
	}

	if existingCheckIn.Status >= 2 {
		utils.BadRequest(c, "今天已签退")
		return
	}

	now := time.Now()
	existingCheckIn.CheckOutTime = &now
	existingCheckIn.Status = 2

	database.DB.Save(&existingCheckIn)

	logOperation(c, userID, c.GetString("username"), c.GetString("role"), "打卡管理", "签退", "用户签退")
	utils.SuccessWithMessage(c, "签退成功", existingCheckIn)
}

// LogController 日志控制器
// GetOperationLogList 获取操作日志列表
func GetOperationLogList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	module := c.Query("module")
	action := c.Query("action")
	userID := c.Query("user_id")

	var logs []models.OperationLog
	var total int64

	query := database.DB.Model(&models.OperationLog{})

	if module != "" {
		query = query.Where("module = ?", module)
	}
	if action != "" {
		query = query.Where("action = ?", action)
	}
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	query.Count(&total)

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&logs).Error; err != nil {
		utils.InternalError(c, "获取操作日志失败")
		return
	}

	utils.Success(c, gin.H{
		"list":      logs,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}
