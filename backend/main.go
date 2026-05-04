package main

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"

	"logistics-backend/config"
	"logistics-backend/database"
	"logistics-backend/routes"
)

func main() {
	// 初始化配置
	config.InitConfig()

	// 初始化数据库
	database.InitDB()

	// 设置Gin模式
	gin.SetMode(config.AppConfig.Server.Mode)

	// 创建Gin引擎
	r := gin.Default()

	// 设置路由
	routes.SetupRoutes(r)

	// 启动服务器
	addr := fmt.Sprintf(":%d", config.AppConfig.Server.Port)
	log.Printf("服务器启动在 %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("启动服务器失败: %v", err)
	}
}
