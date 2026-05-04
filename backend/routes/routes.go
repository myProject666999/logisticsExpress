package routes

import (
	"github.com/gin-gonic/gin"

	"logistics-backend/controllers"
	"logistics-backend/middleware"
)

func SetupRoutes(r *gin.Engine) {
	// CORS 中间件
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// 公开路由（不需要认证）
	public := r.Group("/api")
	{
		// 认证相关
		public.POST("/login", controllers.Login)
		public.POST("/register", controllers.Register)
		
		// 公开的快递查询
		public.GET("/package/track/:tracking_number", controllers.GetPackageByTrackingNumber)
	}

	// 需要认证的路由
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware())
	{
		// 所有用户都可以访问的路由
		// 用户信息
		api.GET("/user/info", controllers.GetCurrentUser)
		api.PUT("/user/profile", controllers.UpdateProfile)
		api.PUT("/user/password", controllers.ChangePassword)

		// 快递查询
		api.GET("/packages", controllers.GetPackageList)
		api.GET("/package/:id", controllers.GetPackageByID)
		api.POST("/package", controllers.CreatePackage) // 寄件

		// 快递操作
		api.POST("/package/:id/pay", controllers.PayPackage)    // 支付
		api.POST("/package/:id/sign", controllers.SignPackage)  // 签收
		api.POST("/package/:id/pickup", controllers.PickupPackage) // 取件

		// 统计数据
		api.GET("/statistics", controllers.GetStatistics)

		// 员工和管理员路由
		employee := api.Group("")
		employee.Use(middleware.EmployeeMiddleware())
		{
			// 快递管理
			employee.PUT("/package/:id", controllers.UpdatePackage)
			employee.DELETE("/package/:id", controllers.DeletePackage)
			employee.POST("/package/:id/inbound", controllers.InboundPackage)    // 入库
			employee.POST("/package/:id/outbound", controllers.OutboundPackage)  // 出库
			employee.POST("/package/:id/deliver", controllers.DeliverPackage)    // 派送

			// 运输管理
			employee.GET("/transports", controllers.GetTransportList)
			employee.POST("/transport", controllers.CreateTransport)
			employee.POST("/transport/:id/complete", controllers.CompleteTransport)

			// 站点管理（员工只读）
			employee.GET("/sites", controllers.GetSiteList)
			employee.GET("/site/:id", controllers.GetSiteByID)
			employee.GET("/sites/select", controllers.GetSiteListForSelect)

			// 用户管理（员工只读）
			employee.GET("/users", controllers.GetUserList)
			employee.GET("/user/:id", controllers.GetUserByID)

			// 打卡
			employee.GET("/checkin/my", controllers.GetMyCheckInList)
			employee.POST("/checkin", controllers.CheckIn)
			employee.POST("/checkout", controllers.CheckOut)
		}

		// 管理员路由
		admin := api.Group("")
		admin.Use(middleware.AdminMiddleware())
		{
			// 站点管理
			admin.POST("/site", controllers.CreateSite)
			admin.PUT("/site/:id", controllers.UpdateSite)
			admin.DELETE("/site/:id", controllers.DeleteSite)

			// 用户管理
			admin.POST("/user", controllers.CreateUser)
			admin.PUT("/user/:id", controllers.UpdateUser)
			admin.DELETE("/user/:id", controllers.DeleteUser)
			admin.POST("/user/:id/reset-password", controllers.ResetUserPassword)

			// 打卡管理
			admin.GET("/checkins", controllers.GetCheckInList)

			// 操作日志
			admin.GET("/logs", controllers.GetOperationLogList)
		}
	}
}
