import React, { useState, useEffect, useCallback } from'react';
import ChatContainer from './components/ChatContainer';
import Sidebar from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');
  const [temperature, setTemperature] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);

  // 从本地存储加载设置
  useEffect(() => {
    const savedApiKey = localStorage.getItem('apiKey');
    const savedModel = localStorage.getItem('selectedModel');
    const savedTemp = localStorage.getItem('temperature');
    
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedModel) setSelectedModel(savedModel);
    if (savedTemp) setTemperature(parseFloat(savedTemp));
  }, []);

  // 保存设置到本地存储
  useEffect(() => {
    localStorage.setItem('apiKey', apiKey);
    localStorage.setItem('selectedModel', selectedModel);
    localStorage.setItem('temperature', temperature.toString());
  }, [apiKey, selectedModel, temperature]);

  // 处理新消息
  const handleSendMessage = useCallback(async (message, isVoice = false) => {
    if (!message.trim()) return;
    
    // 添加用户消息
    const newUserMessage = {
      id: Date.now(),
      content: message,
      role: 'user',
      isVoice
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // 调用AI接口
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          messages: [...messages, newUserMessage],
          model: selectedModel,
          temperature
        })
      });

      if (!response.ok) {
        throw new Error(`API错误: ${response.status}`);
      }

      // 处理SSE流响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';
      let isImageResponse = false;
      let imageUrl = '';

      // 创建AI响应消息
      const aiMessageId = Date.now();
      setMessages(prev => [...prev, {
        id: aiMessageId,
        content: '',
        role: 'assistant',
        isImage: false,
        isStreaming: true
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // 解码数据
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

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
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMessageId ? 
                    {...msg, isImage: true, content: imageUrl, isStreaming: false} : 
                    msg
                ));
              } else if (parsed.choices && parsed.choices[0].delta.content) {
                // 处理文本响应
                aiResponse += parsed.choices[0].delta.content;
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMessageId ? 
                    {...msg, content: aiResponse, isStreaming: true} : 
                    msg
                ));
              }
            } catch (error) {
              console.error('解析SSE数据失败:', error);
            }
          }
        }
      }

      // 结束流式渲染
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId ? 
          {...msg, isStreaming: false} : 
          msg
      ));
      
    } catch (error) {
      console.error('发送消息失败:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId ? 
          {...msg, content: '抱歉，请求处理失败，请检查API设置或网络连接。', isStreaming: false} : 
          msg
      ));
    } finally {
      setIsLoading(false);
    }
  }, [messages, apiKey, selectedModel, temperature]);

  // 处理语音消息
  const handleVoiceMessage = useCallback((transcript) => {
    if (transcript) {
      handleSendMessage(transcript, true);
    }
  }, [handleSendMessage]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <ToastContainer />
      
      {/* 顶部导航栏 */}
      <header className="bg-gradient-primary text-white shadow-md z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <i className="fa fa-comments text-2xl" aria-hidden="true"></i>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-shadow">智语星</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              className="text-white hover:text-light transition-colors duration-200"
              onClick={() => setIsSettingsOpen(true)}
            >
              <i className="fa fa-cog text-lg" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏 - 移动端隐藏 */}
        <Sidebar 
          messages={messages} 
          className="hidden md:block w-64 border-r border-gray-200 bg-white overflow-y-auto" 
        />
        
        {/* 主聊天区域 */}
        <main className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
          <ChatContainer 
            messages={messages}
            onSendMessage={handleSendMessage}
            onVoiceMessage={handleVoiceMessage}
            isLoading={isLoading}
            voiceMode={voiceMode}
            toggleVoiceMode={() => setVoiceMode(!voiceMode)}
          />
        </main>
      </div>

      {/* 设置模态框 */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        setApiKey={setApiKey}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        temperature={temperature}
        setTemperature={setTemperature}
      />
    </div>
  );
}

export default App; 