package config

import (
	"fmt"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
}

type ServerConfig struct {
	Port int
	Mode string
}

type DatabaseConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	DBName   string
	Charset  string
	ParseTime bool
	Loc      string
}

type JWTConfig struct {
	Secret string
	Expire int
}

var AppConfig *Config

func InitConfig() {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./config")
	viper.AddConfigPath("../config")

	if err := viper.ReadInConfig(); err != nil {
		panic(fmt.Errorf("读取配置文件失败: %s", err))
	}

	AppConfig = &Config{
		Server: ServerConfig{
			Port: viper.GetInt("server.port"),
			Mode: viper.GetString("server.mode"),
		},
		Database: DatabaseConfig{
			Host:      viper.GetString("database.host"),
			Port:      viper.GetInt("database.port"),
			Username:  viper.GetString("database.username"),
			Password:  viper.GetString("database.password"),
			DBName:    viper.GetString("database.dbname"),
			Charset:   viper.GetString("database.charset"),
			ParseTime: viper.GetBool("database.parseTime"),
			Loc:       viper.GetString("database.loc"),
		},
		JWT: JWTConfig{
			Secret: viper.GetString("jwt.secret"),
			Expire: viper.GetInt("jwt.expire"),
		},
	}
}

func (d DatabaseConfig) DSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=%s&parseTime=%t&loc=%s",
		d.Username, d.Password, d.Host, d.Port, d.DBName, d.Charset, d.ParseTime, d.Loc)
}
