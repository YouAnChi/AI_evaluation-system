package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
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

func main() {
	// 读取prompt文件
	promptContent, err := os.ReadFile("prompt2.md")
	if err != nil {
		log.Fatal(err)
	}

	// 创建 HTTP 客户端
	client := &http.Client{}
	// 构建请求体
	requestBody := RequestBody{
		// 模型列表：https://help.aliyun.com/zh/model-studio/getting-started/models
		Model: "qwen-plus",
		Messages: []Message{
			{
				Role:    "system",
				Content: string(promptContent),
			},
			{
				Role:    "user",
				Content: "帮我评测一下网易有道教育大模型",
			},
		},
	}
	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		log.Fatal(err)
	}
	// 创建 POST 请求
	req, err := http.NewRequest("POST", "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Fatal(err)
	}
	// 设置请求头
	// 若没有配置环境变量，请用百炼API Key将下行替换为：apiKey := "sk-xxx"
	apiKey := "sk-ad297c6e95034aa896725120f452bac1" // 移除了多余的空格
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	// 发送请求
	resp, err := client.Do(req)
	if err != nil {
		log.Fatal(err)
	}
	defer resp.Body.Close()
	// 读取响应体
	bodyText, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatal(err)
	}
	// 解析响应内容
	var response ResponseBody
	if err := json.Unmarshal(bodyText, &response); err != nil {
		log.Fatal(err)
	}
	// 只打印content内容
	fmt.Println(response.Choices[0].Message.Content)
}
