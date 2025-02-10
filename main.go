package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type RequestBody struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

type ResponseBody struct {
	Choices []struct {
		Message Message `json:"message"`
	} `json:"choices"`
}

type EvaluateRequest struct {
	ModelName string `json:"modelName"`
}

func main() {
	// 设置gin为调试模式
	gin.SetMode(gin.DebugMode)
	r := gin.Default()

	// 提供静态文件服务
	r.Static("/static", "./static")
	// 加载HTML模板
	r.LoadHTMLGlob("templates/*")

	// 首页路由
	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", nil)
	})

	// 评测接口
	r.POST("/evaluate", func(c *gin.Context) {
		gin.DefaultWriter.Write([]byte("收到评测请求\n"))
		var req EvaluateRequest
		if err := c.BindJSON(&req); err != nil {
			gin.DefaultErrorWriter.Write([]byte("请求参数解析失败: " + err.Error() + "\n"))
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// 读取prompt文件
		gin.DefaultWriter.Write([]byte("开始读取prompt文件\n"))
		promptContent, err := os.ReadFile("prompt2.md")
		if err != nil {
			gin.DefaultErrorWriter.Write([]byte("prompt文件读取失败: " + err.Error() + "\n"))
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// 创建 HTTP 客户端
		client := &http.Client{}
		// 构建请求体
		requestBody := RequestBody{
			Model: "qwen-plus",
			Messages: []Message{
				{
					Role:    "system",
					Content: string(promptContent),
				},
				{
					Role:    "user",
					Content: "帮我评测一下" + req.ModelName,
				},
			},
		}

		jsonData, err := json.Marshal(requestBody)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// 创建 POST 请求
		httpReq, err := http.NewRequest("POST", "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", bytes.NewBuffer(jsonData))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// 设置请求头
		apiKey := "sk-ad297c6e95034aa896725120f452bac1"
		httpReq.Header.Set("Authorization", "Bearer "+apiKey)
		httpReq.Header.Set("Content-Type", "application/json")

		// 发送请求
		gin.DefaultWriter.Write([]byte("开始发送API请求到通义千问\n"))
		resp, err := client.Do(httpReq)
		if err != nil {
			gin.DefaultErrorWriter.Write([]byte("API请求失败: " + err.Error() + "\n"))
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer resp.Body.Close()

		// 读取响应体
		bodyText, err := io.ReadAll(resp.Body)
		if err != nil {
			gin.DefaultErrorWriter.Write([]byte("读取响应体失败: " + err.Error() + "\n"))
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// 输出原始响应内容用于调试
		gin.DefaultWriter.Write([]byte("API原始响应: " + string(bodyText) + "\n"))

		// 解析响应内容
		gin.DefaultWriter.Write([]byte("开始解析API响应\n"))
		var response ResponseBody
		if err := json.Unmarshal(bodyText, &response); err != nil {
			gin.DefaultErrorWriter.Write([]byte("API响应解析失败: " + err.Error() + "\n原始响应内容: " + string(bodyText) + "\n"))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "API响应解析失败: " + err.Error()})
			return
		}

		if len(response.Choices) == 0 {
			gin.DefaultErrorWriter.Write([]byte("API响应中没有choices数据\n"))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "API响应中没有choices数据"})
			return
		}

		// 解析评测结果JSON
		var result map[string]interface{}
		// 提取content中的JSON字符串
		content := response.Choices[0].Message.Content
		// 去除可能的markdown代码块标记
		content = strings.TrimPrefix(content, "```json\n")
		content = strings.TrimSuffix(content, "\n```")

		if err := json.Unmarshal([]byte(content), &result); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "评测结果解析失败: " + err.Error()})
			return
		}

		// 返回评测结果
		gin.DefaultWriter.Write([]byte("评测完成，返回结果\n"))
		c.JSON(http.StatusOK, result)
	})

	// 启动服务器
	r.Run(":8080")
}
