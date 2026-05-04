package controllers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"logistics-backend/database"
	"logistics-backend/models"
	"logistics-backend/utils"
)

// GetSiteList 获取站点列表
func GetSiteList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	keyword := c.Query("keyword")

	var sites []models.Site
	var total int64

	query := database.DB.Model(&models.Site{})

	if keyword != "" {
		query = query.Where("name LIKE ? OR address LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	query.Count(&total)

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&sites).Error; err != nil {
		utils.InternalError(c, "获取站点列表失败")
		return
	}

	utils.Success(c, gin.H{
		"list":      sites,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// GetSiteByID 获取站点详情
func GetSiteByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var site models.Site
	if err := database.DB.First(&site, id).Error; err != nil {
		utils.NotFound(c, "站点不存在")
		return
	}

	utils.Success(c, site)
}

// CreateSite 创建站点
func CreateSite(c *gin.Context) {
	var req struct {
		Name    string `json:"name" binding:"required"`
		Address string `json:"address" binding:"required"`
		Phone   string `json:"phone"`
		Manager string `json:"manager"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	// 检查站点名称是否已存在
	var count int64
	database.DB.Model(&models.Site{}).Where("name = ?", req.Name).Count(&count)
	if count > 0 {
		utils.BadRequest(c, "站点名称已存在")
		return
	}

	site := models.Site{
		Name:    req.Name,
		Address: req.Address,
		Phone:   req.Phone,
		Manager: req.Manager,
		Status:  1,
	}

	if err := database.DB.Create(&site).Error; err != nil {
		utils.InternalError(c, "创建站点失败")
		return
	}

	logOperation(c, c.GetUint("user_id"), c.GetString("username"), c.GetString("role"), "站点管理", "创建", "创建站点: "+req.Name)
	utils.SuccessWithMessage(c, "创建成功", site)
}

// UpdateSite 更新站点
func UpdateSite(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var req struct {
		Name    string `json:"name"`
		Address string `json:"address"`
		Phone   string `json:"phone"`
		Manager string `json:"manager"`
		Status  *int   `json:"status"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var site models.Site
	if err := database.DB.First(&site, id).Error; err != nil {
		utils.NotFound(c, "站点不存在")
		return
	}

	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Address != "" {
		updates["address"] = req.Address
	}
	if req.Phone != "" {
		updates["phone"] = req.Phone
	}
	if req.Manager != "" {
		updates["manager"] = req.Manager
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}

	if err := database.DB.Model(&site).Updates(updates).Error; err != nil {
		utils.InternalError(c, "更新站点失败")
		return
	}

	logOperation(c, c.GetUint("user_id"), c.GetString("username"), c.GetString("role"), "站点管理", "更新", "更新站点: "+site.Name)
	utils.SuccessWithMessage(c, "更新成功", site)
}

// DeleteSite 删除站点
func DeleteSite(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var site models.Site
	if err := database.DB.First(&site, id).Error; err != nil {
		utils.NotFound(c, "站点不存在")
		return
	}

	// 检查站点是否有关联的员工
	var employeeCount int64
	database.DB.Model(&models.User{}).Where("site_id = ? AND role = ?", id, models.RoleEmployee).Count(&employeeCount)
	if employeeCount > 0 {
		utils.BadRequest(c, "该站点有关联员工，无法删除")
		return
	}

	// 检查站点是否有关联的快递
	var packageCount int64
	database.DB.Model(&models.Package{}).Where("current_site_id = ? OR from_site_id = ? OR to_site_id = ?", id, id, id).Count(&packageCount)
	if packageCount > 0 {
		utils.BadRequest(c, "该站点有关联快递，无法删除")
		return
	}

	if err := database.DB.Delete(&site).Error; err != nil {
		utils.InternalError(c, "删除站点失败")
		return
	}

	logOperation(c, c.GetUint("user_id"), c.GetString("username"), c.GetString("role"), "站点管理", "删除", "删除站点: "+site.Name)
	utils.SuccessWithMessage(c, "删除成功", nil)
}

// GetSiteListForSelect 获取站点列表（供下拉选择）
func GetSiteListForSelect(c *gin.Context) {
	var sites []models.Site
	if err := database.DB.Where("status = 1").Order("name").Find(&sites).Error; err != nil {
		utils.InternalError(c, "获取站点列表失败")
		return
	}

	result := make([]gin.H, len(sites))
	for i, s := range sites {
		result[i] = gin.H{
			"value": s.ID,
			"label": s.Name,
		}
	}

	utils.Success(c, result)
}
