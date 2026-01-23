const fs = require('fs');

let content = fs.readFileSync('src/MultiDocWorkbench.jsx', 'utf-8');

const startMarker = '  const handleAppButtonClick = async (btn) => {';
const endMarker = '  const [isEditingLayout, setIsEditingLayout] = useState(false);';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find markers');
  process.exit(1);
}

const before = content.substring(0, startIdx);
const after = content.substring(endIdx);

const newFunc = `  // =====================================================
  // 应用端按钮点击处理
  // 应用端只是用户交互界面，真正的 Replay 逻辑在后管端（服务端）执行
  // 点击按钮 → 调用服务端 /api/multi/replay/execute API
  // → 服务端从配置的目录自动加载文件 → 执行沉淀集 Replay → 返回结果
  // → 应用端同步显示加载的文档和执行结果
  // =====================================================
  const handleAppButtonClick = async (btn) => {
    const groupIds = Array.isArray(btn.groupIds) ? btn.groupIds.filter(Boolean) : [];

    if (!groupIds.length) {
      appendAssistantMessage(\`按钮"\${btn.label}"尚未配置沉淀集，请在后管配置后重试。\`);
      return;
    }

    // 显示开始执行的消息
    appendAssistantMessage(\`正在执行"\${btn.label}"，请稍候...\`);
    setIsReplaying(true);
    setReplayStatus(\`正在执行: \${btn.label}\`);

    try {
      // 调用服务端 Replay 执行 API
      // 服务端会从配置的目录自动加载文件，执行所有沉淀步骤
      const response = await fetch('/api/multi/replay/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupIds,
          buttonLabel: btn.label
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || \`服务端返回错误: \${response.status}\`);
      }

      const result = await response.json();

      // 处理服务端返回的已加载文档
      // 这些文档是从后管端配置的目录中自动加载的
      if (Array.isArray(result.docsLoaded) && result.docsLoaded.length > 0) {
        const newDocs = [];
        for (const docData of result.docsLoaded) {
          try {
            // 将服务端加载的文档保存到文档列表
            const createRes = await fetch('/api/docs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: docData.name,
                content: docData.content
              })
            });
            if (createRes.ok) {
              const { doc } = await createRes.json();
              if (doc) newDocs.push(doc);
            }
          } catch (e) {
            console.error('保存文档失败:', docData.name, e);
          }
        }
        
        // 更新文档列表状态
        if (newDocs.length > 0) {
          setDocs(prev => {
            const existingIds = new Set(prev.map(d => d.id));
            const toAdd = newDocs.filter(d => !existingIds.has(d.id));
            return [...toAdd, ...prev];
          });
          
          // 关联到当前场景
          const scene = await loadSharedScene();
          if (scene?.id) {
            const docIds = Array.from(new Set([
              ...newDocs.map(d => d.id),
              ...(scene.docIds || [])
            ]));
            await fetchJson(\`/api/scene/\${scene.id}\`, {
              method: 'PATCH',
              body: { docIds }
            });
          }
        }
      }

      // 显示执行结果
      const messages = [];
      messages.push(\`【\${btn.label}】执行完成\`);
      
      if (result.groupNames?.length) {
        messages.push(\`沉淀集: \${result.groupNames.join('、')}\`);
      }
      
      if (result.docsLoaded?.length) {
        messages.push(\`已自动加载 \${result.docsLoaded.length} 个文档: \${result.docsLoaded.map(d => d.name).join('、')}\`);
      }
      
      if (result.dirPath) {
        messages.push(\`来源目录: \${result.dirPath}\`);
      }
      
      messages.push(\`共执行 \${result.totalSteps || 0} 个步骤\`);

      // 显示每个步骤的结果
      if (Array.isArray(result.results)) {
        for (const step of result.results) {
          const stepMsg = [];
          stepMsg.push(\`  • \${step.action}\`);
          if (step.status === 'done') {
            stepMsg.push(\`[完成]\`);
          } else if (step.status === 'skip') {
            stepMsg.push(\`[跳过: \${step.reason || ''}]\`);
          } else if (step.status === 'fail') {
            stepMsg.push(\`[失败: \${step.reason || ''}]\`);
          }
          messages.push(stepMsg.join(' '));
        }
      }

      appendAssistantMessage(messages.join('\\n'));

      // 刷新文档列表以确保同步
      try {
        const docsRes = await fetch('/api/docs');
        if (docsRes.ok) {
          const data = await docsRes.json();
          if (Array.isArray(data?.docs)) {
            setDocs(data.docs);
          }
        }
      } catch (e) {
        console.error('刷新文档列表失败', e);
      }

    } catch (error) {
      console.error('Replay 执行失败:', error);
      appendAssistantMessage(\`执行"\${btn.label}"失败: \${error.message || '未知错误'}\`);
    } finally {
      setIsReplaying(false);
      setReplayStatus('');
    }
  };



`;

const newContent = before + newFunc + after;
fs.writeFileSync('src/MultiDocWorkbench.jsx', newContent);
console.log('File updated successfully');
console.log('Old function length:', endIdx - startIdx);
console.log('New function length:', newFunc.length);
