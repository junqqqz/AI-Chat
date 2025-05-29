class AIClient {
  constructor({ apiKey, model = 'gpt-3.5-turbo', timeout = 60000 }) {
    this.apiKey = apiKey;
    this.model = model;
    this.timeout = timeout;
    this.controller = new AbortController();
    this.baseUrl = '/api';
  }

  // 设置API密钥
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  // 设置模型
  setModel(model) {
    this.model = model;
  }

  // 设置超时时间
  setTimeout(timeout) {
    this.timeout = timeout;
  }

  // 取消当前请求
  abort() {
    this.controller.abort();
    this.controller = new AbortController();
  }

  // 发送聊天请求，返回SSE流
  async chat(messages, onMessage, onError, onComplete) {
    if (!this.apiKey) {
      throw new Error('API密钥未设置');
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          messages,
          model: this.model,
          stream: true
        }),
        signal: this.controller.signal
      });

      if (!response.ok) {
        throw new Error(`API错误: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let isImageResponse = false;
      let imageUrl = '';

      // 设置超时计时器
      let timeoutId = setTimeout(() => {
        this.abort();
        onError(new Error('请求超时'));
      }, this.timeout);

      while (true) {
        const { done, value } = await reader.read();
        
        // 清除超时计时器
        clearTimeout(timeoutId);
        
        if (done) {
          onComplete({ isImageResponse, imageUrl });
          break;
        }
        
        // 解码数据
        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        
        // 处理SSE消息
        const lines = accumulatedText.split('\n');
        accumulatedText = lines.pop() || ''; // 保留不完整的行
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.imageUrl) {
                // 处理图片响应
                isImageResponse = true;
                imageUrl = parsed.imageUrl;
                onMessage({
                  content: imageUrl,
                  isImage: true
                });
              } else if (parsed.choices && parsed.choices[0].delta.content) {
                // 处理文本响应
                onMessage({
                  content: parsed.choices[0].delta.content,
                  isImage: false
                });
              }
            } catch (error) {
              console.error('解析SSE数据失败:', error);
            }
          }
        }
        
        // 重置超时计时器
        timeoutId = setTimeout(() => {
          this.abort();
          onError(new Error('请求超时'));
        }, this.timeout);
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        onError(new Error('请求已取消'));
      } else {
        onError(error);
      }
    }
  }

  // 上传文件并获取向量（RAG功能）
  async uploadFile(file) {
    if (!this.apiKey) {
      throw new Error('API密钥未设置');
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData,
        signal: this.controller.signal
      });

      if (!response.ok) {
        throw new Error(`文件上传失败: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('上传已取消');
      }
      throw error;
    }
  }

  // 基于上传的文件进行检索
  async retrieveContext(query) {
    if (!this.apiKey) {
      throw new Error('API密钥未设置');
    }

    try {
      const response = await fetch(`${this.baseUrl}/retrieve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ query }),
        signal: this.controller.signal
      });

      if (!response.ok) {
        throw new Error(`检索失败: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('检索已取消');
      }
      throw error;
    }
  }
}

export default AIClient;  