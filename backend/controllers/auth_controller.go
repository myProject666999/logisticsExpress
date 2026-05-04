package controllers

import (
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"logistics-backend/database"
	"logistics-backend/models"
	"logistics-backend/utils"
)

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Password string `json:"password" binding:"required,min=6,max=50"`
	RealName string `json:"real_name"`
	Phone    string `json:"phone"`
	Email    string `json:"email"`
}

type LoginResponse struct {
	Token    string `json:"token"`
	UserInfo UserInfo `json:"user_info"`
}

type UserInfo struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	RealName string `json:"real_name"`
	Role     string `json:"role"`
	Phone    string `json:"phone"`
	Email    string `json:"email"`
	Address  string `json:"address"`
	SiteID   *uint  `json:"site_id,omitempty"`
}

// Login 用户登录
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	// 查找用户
	var user models.User
	if err := database.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		utils.BadRequest(c, "用户名或密码错误")
		return
	}

	// 检查用户状态
	if user.Status == 0 {
		utils.Forbidden(c, "账号已被禁用")
		return
	}

	// 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		utils.BadRequest(c, "用户名或密码错误")
		return
	}

	// 生成token
	token, err := utils.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		utils.InternalError(c, "生成令牌失败")
		return
	}

	// 记录登录日志
	logOperation(c, user.ID, user.Username, user.Role, "认证", "登录", "用户登录系统")

	userInfo := UserInfo{
		ID:       user.ID,
		Username: user.Username,
		RealName: user.RealName,
		Role:     user.Role,
		Phone:    user.Phone,
		Email:    user.Email,
		Address:  user.Address,
		SiteID:   user.SiteID,
	}

	utils.Success(c, LoginResponse{
		Token:    token,
		UserInfo: userInfo,
	})
}

// Register 用户注册
func Register(c *gin.Context) {
	var req RegisterRequest
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

	// 创建用户
	user := models.User{
		Username: req.Username,
		Password: string(hashedPassword),
		RealName: req.RealName,
		Phone:    req.Phone,
		Email:    req.Email,
		Role:     models.RoleUser,
		Status:   1,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		utils.InternalError(c, "注册失败")
		return
	}

	utils.SuccessWithMessage(c, "注册成功", nil)
}

// GetCurrentUser 获取当前登录用户信息
func GetCurrentUser(c *gin.Context) {
	userID := c.GetUint("user_id")

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		utils.NotFound(c, "用户不存在")
		return
	}

	userInfo := UserInfo{
		ID:       user.ID,
		Username: user.Username,
		RealName: user.RealName,
		Role:     user.Role,
		Phone:    user.Phone,
		Email:    user.Email,
		Address:  user.Address,
		SiteID:   user.SiteID,
	}

	utils.Success(c, userInfo)
}

// UpdateProfile 更新个人信息
func UpdateProfile(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		RealName string `json:"real_name"`
		Phone    string `json:"phone"`
		Email    string `json:"email"`
		Address  string `json:"address"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误")
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
	if req.Address != "" {
		updates["address"] = req.Address
	}

	if err := database.DB.Model(&models.User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
		utils.InternalError(c, "更新失败")
		return
	}

	logOperation(c, userID, c.GetString("username"), c.GetString("role"), "用户", "更新信息", "更新个人信息")
	utils.SuccessWithMessage(c, "更新成功", nil)
}

// ChangePassword 修改密码
func ChangePassword(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		utils.NotFound(c, "用户不存在")
		return
	}

	// 验证旧密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
		utils.BadRequest(c, "原密码错误")
		return
	}

	// 加密新密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		utils.InternalError(c, "密码加密失败")
		return
	}

	user.Password = string(hashedPassword)
	if err := database.DB.Save(&user).Error; err != nil {
		utils.InternalError(c, "修改密码失败")
		return
	}

	logOperation(c, userID, c.GetString("username"), c.GetString("role"), "用户", "修改密码", "修改登录密码")
	utils.SuccessWithMessage(c, "密码修改成功", nil)
}

// logOperation 记录操作日志
func logOperation(c *gin.Context, userID uint, username, role, module, action, content string) {
	log := models.OperationLog{
		UserID:    userID,
		Username:  username,
		Role:      role,
		Module:    module,
		Action:    action,
		Content:   content,
		IPAddress: c.ClientIP(),
		UserAgent: c.GetHeader("User-Agent"),
		CreatedAt: time.Now(),
	}
	database.DB.Create(&log)
}
