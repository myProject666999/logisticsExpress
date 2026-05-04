package controllers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"logistics-backend/database"
	"logistics-backend/models"
	"logistics-backend/utils"
)

// GetUserList 获取用户列表
func GetUserList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	role := c.Query("role")
	keyword := c.Query("keyword")

	var users []models.User
	var total int64

	query := database.DB.Model(&models.User{})

	if role != "" {
		query = query.Where("role = ?", role)
	}
	if keyword != "" {
		query = query.Where("username LIKE ? OR real_name LIKE ? OR phone LIKE ?", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}

	query.Count(&total)

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&users).Error; err != nil {
		utils.InternalError(c, "获取用户列表失败")
		return
	}

	utils.Success(c, gin.H{
		"list":      users,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// GetUserByID 获取用户详情
func GetUserByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		utils.NotFound(c, "用户不存在")
		return
	}

	utils.Success(c, user)
}

// CreateUser 创建用户
func CreateUser(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
		RealName string `json:"real_name"`
		Phone    string `json:"phone"`
		Email    string `json:"email"`
		Role     string `json:"role" binding:"required"`
		SiteID   *uint  `json:"site_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	// 检查用户名是否已存在
	var count int64
	database.DB.Model(&models.User{}).Where("username = ?", req.Username).Count(&count)
	if count > 0 {
		utils.BadRequest(c, "用户名已存在")
		return
	}

	// 加密密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		utils.InternalError(c, "密码加密失败")
		return
	}

	user := models.User{
		Username: req.Username,
		Password: string(hashedPassword),
		RealName: req.RealName,
		Phone:    req.Phone,
		Email:    req.Email,
		Role:     req.Role,
		SiteID:   req.SiteID,
		Status:   1,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		utils.InternalError(c, "创建用户失败")
		return
	}

	logOperation(c, c.GetUint("user_id"), c.GetString("username"), c.GetString("role"), "用户管理", "创建", "创建用户: "+req.Username)
	utils.SuccessWithMessage(c, "创建成功", user)
}

// UpdateUser 更新用户
func UpdateUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var req struct {
		RealName string `json:"real_name"`
		Phone    string `json:"phone"`
		Email    string `json:"email"`
		Role     string `json:"role"`
		SiteID   *uint  `json:"site_id"`
		Status   *int   `json:"status"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		utils.NotFound(c, "用户不存在")
		return
	}

	updates := map[string]interface{}{}
	if req.RealName != "" {
		updates["real_name"] = req.RealName
	}
	if req.Phone != "" {
		updates["phone"] = req.Phone
	}
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.Role != "" {
		updates["role"] = req.Role
	}
	if req.SiteID != nil {
		updates["site_id"] = req.SiteID
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}

	if err := database.DB.Model(&user).Updates(updates).Error; err != nil {
		utils.InternalError(c, "更新用户失败")
		return
	}

	logOperation(c, c.GetUint("user_id"), c.GetString("username"), c.GetString("role"), "用户管理", "更新", "更新用户: "+user.Username)
	utils.SuccessWithMessage(c, "更新成功", user)
}

// DeleteUser 删除用户
func DeleteUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		utils.NotFound(c, "用户不存在")
		return
	}

	// 不允许删除自己
	if user.ID == c.GetUint("user_id") {
		utils.BadRequest(c, "不能删除自己")
		return
	}

	if err := database.DB.Delete(&user).Error; err != nil {
		utils.InternalError(c, "删除用户失败")
		return
	}

	logOperation(c, c.GetUint("user_id"), c.GetString("username"), c.GetString("role"), "用户管理", "删除", "删除用户: "+user.Username)
	utils.SuccessWithMessage(c, "删除成功", nil)
}

// ResetUserPassword 重置用户密码
func ResetUserPassword(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var req struct {
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		utils.NotFound(c, "用户不存在")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		utils.InternalError(c, "密码加密失败")
		return
	}

	user.Password = string(hashedPassword)
	if err := database.DB.Save(&user).Error; err != nil {
		utils.InternalError(c, "重置密码失败")
		return
	}

	logOperation(c, c.GetUint("user_id"), c.GetString("username"), c.GetString("role"), "用户管理", "重置密码", "重置用户密码: "+user.Username)
	utils.SuccessWithMessage(c, "密码重置成功", nil)
}
