package database

import (
	"log"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"logistics-backend/config"
	"logistics-backend/models"
)

var DB *gorm.DB

func InitDB() {
	dsn := config.AppConfig.Database.DSN()
	
	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	
	if err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}
	
	log.Println("数据库连接成功")
	
	// 自动迁移表
	err = DB.AutoMigrate(
		&models.User{},
		&models.Site{},
		&models.Package{},
		&models.Transport{},
		&models.CheckIn{},
		&models.OperationLog{},
		&models.Menu{},
		&models.RoleMenu{},
		&models.PackageTrack{},
	)
	
	if err != nil {
		log.Fatalf("数据库迁移失败: %v", err)
	}
	
	log.Println("数据库迁移完成")
	
	// 初始化数据
	initData()
}

func initData() {
	// 检查是否已有管理员
	var count int64
	DB.Model(&models.User{}).Where("role = ?", models.RoleAdmin).Count(&count)
	
	if count == 0 {
		// 创建默认管理员
		admin := &models.User{
			Username: "admin",
			Password: "$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5E", // admin123
			RealName: "系统管理员",
			Role:     models.RoleAdmin,
			Status:   1,
		}
		DB.Create(admin)
		log.Println("默认管理员创建成功: 账号 admin, 密码 admin123")
	}
	
	// 初始化菜单
	initMenus()
}

func initMenus() {
	// 先检查是否已有菜单
	var count int64
	DB.Model(&models.Menu{}).Count(&count)
	if count > 0 {
		return
	}
	
	menus := []models.Menu{
		// 管理员菜单
		{Name: "首页", Path: "/", Component: "Home", Icon: "HomeOutlined", Sort: 1, Visible: 1},
		{Name: "站点管理", Path: "/site", Component: "Site", Icon: "ShopOutlined", Sort: 2, Visible: 1},
		{Name: "运输管理", Path: "/transport", Component: "Transport", Icon: "CarOutlined", Sort: 3, Visible: 1},
		{Name: "快递管理", Path: "/package", Component: "Package", Icon: "InboxOutlined", Sort: 4, Visible: 1},
		{Name: "快递入库", Path: "/package/inbound", Component: "PackageInbound", Icon: "ImportOutlined", Sort: 5, Visible: 1},
		{Name: "商品出库管理", Path: "/package/outbound", Component: "PackageOutbound", Icon: "ExportOutlined", Sort: 6, Visible: 1},
		{Name: "快递派送", Path: "/package/deliver", Component: "PackageDeliver", Icon: "CarryOutOutlined", Sort: 7, Visible: 1},
		{Name: "寄件管理", Path: "/send", Component: "Send", Icon: "SendOutlined", Sort: 8, Visible: 1},
		{Name: "取件管理", Path: "/pickup", Component: "Pickup", Icon: "PullRequestOutlined", Sort: 9, Visible: 1},
		{Name: "签收管理", Path: "/sign", Component: "Sign", Icon: "CheckCircleOutlined", Sort: 10, Visible: 1},
		{Name: "用户管理", Path: "/user", Component: "User", Icon: "UserOutlined", Sort: 11, Visible: 1},
		{Name: "打卡管理", Path: "/checkin", Component: "CheckIn", Icon: "ClockCircleOutlined", Sort: 12, Visible: 1},
		{Name: "操作日志", Path: "/log", Component: "Log", Icon: "FileTextOutlined", Sort: 13, Visible: 1},
		{Name: "菜单管理", Path: "/menu", Component: "Menu", Icon: "MenuOutlined", Sort: 14, Visible: 1},
		{Name: "个人中心", Path: "/profile", Component: "Profile", Icon: "ProfileOutlined", Sort: 15, Visible: 1},
	}
	
	for _, menu := range menus {
		DB.Create(&menu)
	}
	
	// 初始化角色菜单关联
	roleMenus := []models.RoleMenu{
		// 用户菜单
		{Role: models.RoleUser, MenuID: 1},  // 首页
		{Role: models.RoleUser, MenuID: 15}, // 个人中心
		// 员工菜单
		{Role: models.RoleEmployee, MenuID: 1},  // 首页
		{Role: models.RoleEmployee, MenuID: 4},  // 快递管理
		{Role: models.RoleEmployee, MenuID: 5},  // 快递入库
		{Role: models.RoleEmployee, MenuID: 6},  // 商品出库管理
		{Role: models.RoleEmployee, MenuID: 7},  // 快递派送
		{Role: models.RoleEmployee, MenuID: 8},  // 寄件管理
		{Role: models.RoleEmployee, MenuID: 9},  // 取件管理
		{Role: models.RoleEmployee, MenuID: 10}, // 签收管理
		{Role: models.RoleEmployee, MenuID: 11}, // 用户管理
		{Role: models.RoleEmployee, MenuID: 15}, // 个人中心
		// 管理员菜单 - 全部
		{Role: models.RoleAdmin, MenuID: 1},  // 首页
		{Role: models.RoleAdmin, MenuID: 2},  // 站点管理
		{Role: models.RoleAdmin, MenuID: 3},  // 运输管理
		{Role: models.RoleAdmin, MenuID: 4},  // 快递管理
		{Role: models.RoleAdmin, MenuID: 5},  // 快递入库
		{Role: models.RoleAdmin, MenuID: 6},  // 商品出库管理
		{Role: models.RoleAdmin, MenuID: 7},  // 快递派送
		{Role: models.RoleAdmin, MenuID: 8},  // 寄件管理
		{Role: models.RoleAdmin, MenuID: 9},  // 取件管理
		{Role: models.RoleAdmin, MenuID: 10}, // 签收管理
		{Role: models.RoleAdmin, MenuID: 11}, // 用户管理
		{Role: models.RoleAdmin, MenuID: 12}, // 打卡管理
		{Role: models.RoleAdmin, MenuID: 13}, // 操作日志
		{Role: models.RoleAdmin, MenuID: 14}, // 菜单管理
		{Role: models.RoleAdmin, MenuID: 15}, // 个人中心
	}
	
	for _, rm := range roleMenus {
		DB.Create(&rm)
	}
	
	log.Println("菜单初始化完成")
}
