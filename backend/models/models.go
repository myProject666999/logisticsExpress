package models

import (
	"time"

	"gorm.io/gorm"
)

// 角色常量
const (
	RoleUser      = "user"      // 普通用户
	RoleEmployee  = "employee"  // 员工
	RoleAdmin     = "admin"     // 管理员
)

// 快递状态常量
const (
	PackageStatusPending    = "pending"     // 待处理
	PackageStatusShipped    = "shipped"     // 已发货
	PackageStatusInTransit  = "in_transit"  // 运输中
	PackageStatusArrived    = "arrived"     // 已到达站点
	PackageStatusDelivering = "delivering"  // 派送中
	PackageStatusSigned     = "signed"      // 已签收
	PackageStatusPicked     = "picked"      // 已取件
)

// User 用户模型
type User struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Username    string         `json:"username" gorm:"uniqueIndex;size:50;not null"`
	Password    string         `json:"-" gorm:"size:255;not null"`
	RealName    string         `json:"real_name" gorm:"size:50"`
	Phone       string         `json:"phone" gorm:"size:20"`
	Email       string         `json:"email" gorm:"size:100"`
	Role        string         `json:"role" gorm:"size:20;default:'user'"` // user, employee, admin
	Address     string         `json:"address" gorm:"size:255"`
	SiteID      *uint          `json:"site_id,omitempty"` // 员工所属站点ID
	Status      int            `json:"status" gorm:"default:1"` // 1: 正常, 0: 禁用
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// Site 站点模型
type Site struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Name        string         `json:"name" gorm:"size:100;not null"`
	Address     string         `json:"address" gorm:"size:255;not null"`
	Phone       string         `json:"phone" gorm:"size:20"`
	Manager     string         `json:"manager" gorm:"size:50"`
	Status      int            `json:"status" gorm:"default:1"` // 1: 正常, 0: 关闭
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// Package 快递模型
type Package struct {
	ID              uint           `json:"id" gorm:"primaryKey"`
	TrackingNumber  string         `json:"tracking_number" gorm:"uniqueIndex;size:50;not null"`
	SenderName      string         `json:"sender_name" gorm:"size:50;not null"`
	SenderPhone     string         `json:"sender_phone" gorm:"size:20;not null"`
	SenderAddress   string         `json:"sender_address" gorm:"size:255;not null"`
	ReceiverName    string         `json:"receiver_name" gorm:"size:50;not null"`
	ReceiverPhone   string         `json:"receiver_phone" gorm:"size:20;not null"`
	ReceiverAddress string         `json:"receiver_address" gorm:"size:255;not null"`
	GoodsName       string         `json:"goods_name" gorm:"size:100"`
	GoodsWeight     float64        `json:"goods_weight" gorm:"type:decimal(10,2)"`
	GoodsValue      float64        `json:"goods_value" gorm:"type:decimal(10,2)"`
	ShippingFee     float64        `json:"shipping_fee" gorm:"type:decimal(10,2)"`
	Status          string         `json:"status" gorm:"size:20;default:'pending'"`
	CurrentSiteID   *uint          `json:"current_site_id,omitempty"`
	FromSiteID      *uint          `json:"from_site_id,omitempty"`
	ToSiteID        *uint          `json:"to_site_id,omitempty"`
	SenderUserID    *uint          `json:"sender_user_id,omitempty"` // 寄件人用户ID
	ReceiverUserID  *uint          `json:"receiver_user_id,omitempty"` // 收件人用户ID
	EmployeeID      *uint          `json:"employee_id,omitempty"`     // 负责员工ID
	PaymentStatus   int            `json:"payment_status" gorm:"default:0"` // 0: 未支付, 1: 已支付
	PaymentTime     *time.Time     `json:"payment_time,omitempty"`
	SignTime        *time.Time     `json:"sign_time,omitempty"`
	PickTime        *time.Time     `json:"pick_time,omitempty"`
	InboundTime     *time.Time     `json:"inbound_time,omitempty"`
	OutboundTime    *time.Time     `json:"outbound_time,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `json:"-" gorm:"index"`
}

// Transport 运输模型
type Transport struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	PackageID    uint           `json:"package_id" gorm:"index"`
	FromSiteID   uint           `json:"from_site_id"`
	ToSiteID     uint           `json:"to_site_id"`
	Status       string         `json:"status" gorm:"size:20;default:'in_transit'"` // in_transit, completed
	EmployeeID   *uint          `json:"employee_id,omitempty"`
	StartTime    *time.Time     `json:"start_time,omitempty"`
	EndTime      *time.Time     `json:"end_time,omitempty"`
	Description  string         `json:"description" gorm:"size:255"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}

// CheckIn 打卡模型
type CheckIn struct {
	ID         uint           `json:"id" gorm:"primaryKey"`
	UserID     uint           `json:"user_id" gorm:"index"`
	SiteID     uint           `json:"site_id"`
	CheckInTime *time.Time    `json:"check_in_time,omitempty"`
	CheckOutTime *time.Time   `json:"check_out_time,omitempty"`
	Date       string         `json:"date" gorm:"size:20;index"` // 2024-01-01
	Status     int            `json:"status" gorm:"default:0"` // 0: 未打卡, 1: 已签到, 2: 已签退
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`
}

// OperationLog 操作日志模型
type OperationLog struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	UserID      uint           `json:"user_id"`
	Username    string         `json:"username" gorm:"size:50"`
	Role        string         `json:"role" gorm:"size:20"`
	Module      string         `json:"module" gorm:"size:50"`
	Action      string         `json:"action" gorm:"size:50"`
	Content     string         `json:"content" gorm:"type:text"`
	IPAddress   string         `json:"ip_address" gorm:"size:50"`
	UserAgent   string         `json:"user_agent" gorm:"size:255"`
	CreatedAt   time.Time      `json:"created_at"`
}

// Menu 菜单模型
type Menu struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	ParentID    *uint          `json:"parent_id,omitempty"`
	Name        string         `json:"name" gorm:"size:50;not null"`
	Path        string         `json:"path" gorm:"size:100"`
	Component   string         `json:"component" gorm:"size:255"`
	Icon        string         `json:"icon" gorm:"size:50"`
	Sort        int            `json:"sort" gorm:"default:0"`
	Status      int            `json:"status" gorm:"default:1"` // 1: 显示, 0: 隐藏
	Visible     int            `json:"visible" gorm:"default:1"` // 1: 可见, 0: 隐藏
	Roles       []string       `json:"roles" gorm:"-"` // 前端使用，不存数据库
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// RoleMenu 角色菜单关联表
type RoleMenu struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Role      string    `json:"role" gorm:"size:20;not null"`
	MenuID    uint      `json:"menu_id"`
	CreatedAt time.Time `json:"created_at"`
}

// PackageTrack 快递轨迹模型
type PackageTrack struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	PackageID   uint           `json:"package_id" gorm:"index"`
	Status      string         `json:"status" gorm:"size:20"`
	Description string         `json:"description" gorm:"size:255"`
	Location    string         `json:"location" gorm:"size:255"`
	Operator    string         `json:"operator" gorm:"size:50"`
	CreatedAt   time.Time      `json:"created_at"`
}
