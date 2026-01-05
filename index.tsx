
import React, { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Search, 
  Upload, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Layers, 
  Info, 
  Sparkles,
  FileText,
  Clock,
  Filter,
  X,
  Play,
  Copy,
  Maximize2,
  Check,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import * as ReactWindow from 'react-window';

// 解决 react-window 导入类型问题
const List = (ReactWindow as any).VariableSizeList;
const areEqual = (ReactWindow as any).areEqual;

// --- 类型定义 ---
interface LogEntry {
  id: string;
  timestamp: string | number;
  level: string;
  message: string;
  data: Record<string, any>;
  raw: string;
}

// --- 工具函数 ---
const parseLogs = (input: string): LogEntry[] => {
  const lines = input.trim().split('\n');
  const entries: LogEntry[] = [];
  const now = Date.now();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      const data = typeof parsed === 'object' ? parsed : { value: parsed };
      
      const timestamp = data.timestamp || data.time || data['@timestamp'] || now;
      const level = (data.level || data.severity || 'info').toString().toLowerCase();
      const message = data.message || data.msg || data.text || JSON.stringify(data);

      entries.push({
        id: `log-${i}-${now}`,
        timestamp,
        level,
        message,
        data,
        raw: line
      });
    } catch (e) {
      entries.push({
        id: `log-${i}-${now}`,
        timestamp: now,
        level: 'info',
        message: line,
        data: { raw: line },
        raw: line
      });
    }
  }
  return entries;
};

const formatTimestamp = (ts: string | number) => {
  try {
    const d = new Date(ts);
    return d.toLocaleString('zh-CN');
  } catch {
    return String(ts);
  }
};

const tryFormatValue = (val: any): string => {
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return val;
    }
  }
  return JSON.stringify(val, null, 2);
};

// --- 组件 ---

const DetailModal = ({ 
  title, 
  content, 
  onClose, 
  onExplain 
}: { 
  title: string; 
  content: string; 
  onClose: () => void;
  onExplain?: () => void;
}) => {
  const [copied, setCopied] = useState(false);
  const displayContent = useMemo(() => tryFormatValue(content), [content]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/20 p-2 rounded-lg">
              <FileText size={18} className="text-cyan-400" />
            </div>
            <h3 className="font-bold text-slate-100">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {onExplain && (
              <button 
                onClick={onExplain}
                className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-bold transition-all shadow-lg"
              >
                <Sparkles size={14} />
                AI 解析
              </button>
            )}
            <button 
              onClick={copyToClipboard}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              {copied ? '已复制' : '复制'}
            </button>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-200">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6 bg-slate-950/50 no-scrollbar">
          <pre className="mono text-sm leading-relaxed text-slate-300 whitespace-pre-wrap break-all">
            {displayContent}
          </pre>
        </div>
        <div className="p-3 bg-slate-800/30 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
          <span>内容长度: {content.length} 字符</span>
          <span className="flex items-center gap-1 italic"><Info size={10}/> 支持长堆栈信息和 JSON 格式化显示</span>
        </div>
      </div>
    </div>
  );
};

// 虚拟化行组件
const LogRow = memo(({ index, style, data }: any) => {
  const { logs, visibleFields, onExplain, onShowDetail, onToggleExpand, expandedIds, levelColors } = data;
  const log = logs[index];
  const isExpanded = expandedIds.has(log.id);
  const colorClass = levelColors[log.level] || 'text-slate-300 border-l-2 border-slate-500';

  return (
    <div style={style} className={`border-b border-slate-800/40 hover:bg-slate-800/50 transition-colors flex flex-col overflow-hidden`}>
      <div 
        className="flex items-center h-[48px] cursor-pointer shrink-0" 
        onClick={() => onToggleExpand(log.id, index)}
      >
        <div className="w-10 flex justify-center text-slate-500">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
        <div className="w-44 mono text-[11px] text-slate-400 px-4 truncate">
          {formatTimestamp(log.timestamp)}
        </div>
        <div className={`w-24 font-bold px-4 ${colorClass}`}>
          {log.level.toUpperCase()}
        </div>
        {visibleFields.map((f: string) => {
          const val = JSON.stringify(log.data[f] ?? '');
          const isLong = val.length > 50;
          return (
            <div 
              key={f} 
              className="w-[180px] px-4 truncate text-slate-300 mono text-xs hover:text-cyan-400 flex items-center"
              onClick={(e) => {
                if (isLong) {
                  e.stopPropagation();
                  onShowDetail(f, String(log.data[f] ?? ''), log);
                }
              }}
            >
              <span className="truncate">{val}</span>
              {isLong && <Maximize2 size={10} className="inline ml-1 opacity-50 shrink-0" />}
            </div>
          );
        })}
        <div 
          className="flex-1 px-4 text-slate-100 truncate mono text-xs hover:bg-slate-700/30 rounded transition-all group flex items-center overflow-hidden"
          onClick={(e) => {
            if (log.message.length > 100) {
              e.stopPropagation();
              onShowDetail('消息内容摘要', log.message, log);
            }
          }}
        >
          <span className="truncate flex-1">{log.message}</span>
          {log.message.length > 100 && (
            <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-2">
              全文
            </span>
          )}
        </div>
        <div className="w-28 flex justify-center px-4">
          <button 
            onClick={(e) => { e.stopPropagation(); onExplain(log); }}
            className="inline-flex items-center gap-1.5 p-1 px-3 hover:bg-cyan-500/20 rounded-full text-cyan-400 transition-all border border-transparent hover:border-cyan-500/30"
          >
            <Sparkles size={12} />
            <span className="text-[10px] font-bold">诊断</span>
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="flex-1 bg-slate-900/95 p-6 border-t border-slate-700/50 animate-in slide-in-from-top-2 overflow-hidden">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
              <div className="flex flex-col min-w-0">
                 <div className="flex items-center justify-between mb-3">
                   <h4 className="text-[10px] font-black text-cyan-500/70 uppercase tracking-widest">完整 JSON 详情</h4>
                   <button onClick={() => onShowDetail('日志原文', log.raw, log)} className="text-[10px] text-slate-400 hover:text-cyan-400 transition-colors">查看原始文本</button>
                 </div>
                 <pre className="mono text-[11px] p-4 bg-slate-950/80 rounded-xl border border-slate-800 overflow-auto flex-1 no-scrollbar text-slate-400 shadow-inner">
                    {JSON.stringify(log.data, null, 2)}
                 </pre>
              </div>
              <div className="flex flex-col gap-5 min-w-0">
                 <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/50 shadow-sm">
                       <span className="text-[10px] font-bold text-slate-500 block mb-2 uppercase tracking-tight">日志内部标识 (Log ID)</span>
                       <span className="mono text-xs text-slate-200 break-all bg-slate-900/50 px-2 py-1 rounded inline-block">{log.id}</span>
                    </div>
                    <div className="p-5 bg-slate-800/80 rounded-2xl border border-slate-700/50 shadow-sm flex-1 flex flex-col">
                       <h5 className="font-bold text-[10px] mb-3 flex items-center gap-2 text-cyan-400 uppercase tracking-tight">
                          <Info size={12} /> 消息内容摘要
                       </h5>
                       <div className="mono text-xs text-slate-300 leading-relaxed overflow-y-auto no-scrollbar max-h-[120px] bg-slate-900/50 p-3 rounded-xl border border-slate-700/30">
                          {log.message}
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}, areEqual);

const LogTable = ({ 
  logs, 
  visibleFields, 
  onExplain,
  onShowDetail
}: { 
  logs: LogEntry[], 
  visibleFields: string[], 
  onExplain: (log: LogEntry) => void,
  onShowDetail: (title: string, content: string, log: LogEntry) => void
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<any>(null);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          setContainerHeight(entry.contentRect.height);
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const onToggleExpand = useCallback((id: string, index: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // 当行高改变时，必须通知 VariableSizeList 重新计算偏移量
    if (listRef.current) {
      listRef.current.resetAfterIndex(index);
    }
  }, []);

  const levelColors: Record<string, string> = useMemo(() => ({
    error: 'text-red-400 border-l-2 border-red-500',
    warn: 'text-yellow-400 border-l-2 border-yellow-500',
    info: 'text-blue-400 border-l-2 border-blue-500',
    debug: 'text-slate-400 border-l-2 border-slate-500'
  }), []);

  const itemData = useMemo(() => ({
    logs,
    visibleFields,
    onExplain,
    onShowDetail,
    onToggleExpand,
    expandedIds,
    levelColors
  }), [logs, visibleFields, onExplain, onShowDetail, onToggleExpand, expandedIds, levelColors]);

  const getItemSize = useCallback((index: number) => {
    return expandedIds.has(logs[index].id) ? 360 : 48;
  }, [logs, expandedIds]);

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 italic">
        <FileText size={48} className="mb-4 opacity-20" />
        <p>未找到符合条件的日志记录。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/40 rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden backdrop-blur-sm" ref={containerRef}>
      {/* 表头固定 */}
      <div className="flex items-center h-12 bg-slate-900/90 border-b border-slate-700 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] shrink-0 no-scrollbar overflow-x-auto z-10">
        <div className="w-10 shrink-0"></div>
        <div className="w-44 px-4 shrink-0">时间戳</div>
        <div className="w-24 px-4 shrink-0">级别</div>
        {visibleFields.map(f => (
          <div key={f} className="w-[180px] px-4 shrink-0 truncate">{f}</div>
        ))}
        <div className="flex-1 px-4 shrink-0">消息内容摘要</div>
        <div className="w-28 px-4 shrink-0 text-center">专家操作</div>
      </div>

      {/* 虚拟化列表 - 使用 VariableSizeList */}
      <div className="flex-1 min-h-0">
        <List
          ref={listRef}
          height={containerHeight - 48}
          itemCount={logs.length}
          itemSize={getItemSize}
          width="100%"
          itemData={itemData}
          className="no-scrollbar"
        >
          {LogRow}
        </List>
      </div>
    </div>
  );
};

const Histogram = ({ logs }: { logs: LogEntry[] }) => {
  const chartData = useMemo(() => {
    if (logs.length === 0) return [];
    
    const buckets: Record<string, number> = {};
    const sorted = [...logs].sort((a, b) => {
      const ta = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime();
      const tb = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
      return ta - tb;
    });

    const step = Math.max(1, Math.floor(sorted.length / 50)); 
    for(let i=0; i<sorted.length; i+=step) {
      const log = sorted[i];
      const d = new Date(log.timestamp);
      const label = d.getHours().toString().padStart(2, '0') + ':' + 
                    Math.floor(d.getMinutes() / 10).toString().padStart(1, '0') + '0';
      buckets[label] = (buckets[label] || 0) + 1;
    }

    return Object.entries(buckets).map(([time, count]) => ({ time, count }));
  }, [logs]);

  if (chartData.length === 0) return null;

  return (
    <div className="h-32 mb-6 bg-slate-900/60 rounded-2xl p-4 border border-slate-700/50 shadow-lg shrink-0">
      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
        <Activity size={12} className="text-cyan-500" />
        日志流量统计图
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.3} />
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#475569', fontSize: 8 }}
          />
          <YAxis hide />
          <Tooltip 
            cursor={{ fill: 'rgba(51, 65, 85, 0.2)' }}
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
          />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill="#06b6d4" fillOpacity={0.4} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<{ content: string; logId: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [detailView, setDetailView] = useState<{ title: string; content: string; log: LogEntry } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const availableFields = useMemo(() => {
    const fields = new Set<string>();
    logs.slice(0, 200).forEach(log => {
      Object.keys(log.data).forEach(key => fields.add(key));
    });
    ['timestamp', 'time', '@timestamp', 'level', 'message', 'msg', 'text', 'raw', 'id'].forEach(f => fields.delete(f));
    return Array.from(fields).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!debouncedSearch) return logs;
    const lower = debouncedSearch.toLowerCase();
    return logs.filter(log => 
      log.message.toLowerCase().includes(lower) || 
      log.level.toLowerCase().includes(lower) ||
      log.raw.toLowerCase().includes(lower)
    );
  }, [logs, debouncedSearch]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setLogs(parseLogs(text));
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setLogs(parseLogs(text));
      };
      reader.readAsText(file);
    }
  };

  const explainLogWithAI = async (log: LogEntry, specificFieldContent?: string) => {
    setIsAnalyzing(true);
    setAiAnalysis({ logId: log.id, content: '正在咨询 Gemini AI...' });
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `你是一位资深的运维专家 (SRE)。请用中文解析以下这条日志。
      ${specificFieldContent ? `用户特别关注以下内容：\n${specificFieldContent}\n` : ''}
      
      你的目标是：
      1. 用通俗易懂的语言解释这条日志发生了什么。
      2. 如果是错误或异常堆栈，请识别根本原因和出错的代码位置。
      3. 提供具体的修复或排查建议。
      
      日志上下文：
      时间戳: ${log.timestamp}
      级别: ${log.level}
      消息: ${log.message}
      完整数据预览: ${JSON.stringify(log.data).slice(0, 500)}...
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAiAnalysis({ logId: log.id, content: response.text || '未能生成诊断结果。' });
    } catch (err) {
      setAiAnalysis({ logId: log.id, content: '连接 AI 服务失败。请检查 API 密钥配置。' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleField = (field: string) => {
    setVisibleFields(prev => 
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  return (
    <div 
      className={`flex flex-col h-screen transition-all duration-500 ${isDragging ? 'bg-slate-800' : 'bg-slate-950'}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <header className="h-16 flex items-center justify-between px-8 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-2 rounded-xl shadow-lg shadow-cyan-500/20">
            <Layers size={20} className="text-slate-900" />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              跃志 LOGLEAP
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">极速日志分析引擎</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".log,.json,.txt"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2 bg-slate-800 hover:bg-slate-700 rounded-full text-sm font-bold transition-all border border-slate-700 shadow-xl"
          >
            <Upload size={16} className="text-cyan-400" />
            <span>导入日志</span>
          </button>
          <div className="w-px h-6 bg-slate-800" />
          <button 
            onClick={() => { setLogs([]); setAiAnalysis(null); }}
            className="p-2 text-slate-500 hover:text-red-400 transition-colors"
            title="清空记录"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-slate-900/40 border-r border-slate-800 overflow-y-auto p-6 shrink-0 hidden md:block">
          <div className="mb-8">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Filter size={12} className="text-cyan-500" />
              动态列选择
            </h3>
            <div className="space-y-1.5">
              {availableFields.map(field => (
                <label 
                  key={field} 
                  className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer group transition-all ${visibleFields.includes(field) ? 'bg-cyan-500/10 border border-cyan-500/20' : 'hover:bg-slate-800 border border-transparent'}`}
                >
                  <input 
                    type="checkbox" 
                    checked={visibleFields.includes(field)}
                    onChange={() => toggleField(field)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/20"
                  />
                  <span className={`text-xs truncate ${visibleFields.includes(field) ? 'text-cyan-400 font-bold' : 'text-slate-500 group-hover:text-slate-300'}`}>{field}</span>
                </label>
              ))}
              {availableFields.length === 0 && (
                <div className="text-[10px] text-slate-600 bg-slate-800/30 p-4 rounded-lg italic text-center">
                  解析后自动提取字段
                </div>
              )}
            </div>
          </div>
          
          <div className="p-5 bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-2xl border border-slate-700/50">
            <h4 className="text-xs font-bold mb-2 flex items-center gap-2 text-cyan-400">
              <Sparkles size={14} />
              交互优化
            </h4>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              现在点击任何行都可展开详细信息。已引入 VariableSizeList 动态计算行高，确保大规模数据下展开内容不再重叠。
            </p>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          <div className="p-6 bg-slate-900/20 border-b border-slate-900/50">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-500 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="搜索日志消息、级别或原始文本..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 outline-none transition-all placeholder:text-slate-600 shadow-inner"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                 <div className="text-[10px] font-black text-slate-500 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                   {filteredLogs.length.toLocaleString()} 匹配项
                 </div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden p-6">
            {logs.length > 0 ? (
              <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Histogram logs={filteredLogs} />
                <div className="flex-1 min-h-0">
                  <LogTable 
                    logs={filteredLogs} 
                    visibleFields={visibleFields} 
                    onExplain={explainLogWithAI}
                    onShowDetail={(title, content, log) => setDetailView({ title, content, log })}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12">
                <div className="w-28 h-28 bg-slate-900 rounded-[2.5rem] flex items-center justify-center mb-8 border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group hover:scale-105 transition-transform duration-500">
                  <Upload size={48} className="text-slate-700 group-hover:text-cyan-500 transition-colors" />
                </div>
                <h2 className="text-3xl font-black text-slate-200 mb-3 tracking-tight italic">跃志分析就绪</h2>
                <p className="text-slate-500 max-w-sm mb-10 font-medium">
                  极致渲染引擎已启动。支持大规模日志流畅预览与 AI 实时诊断。
                </p>
                <div className="flex gap-4">
                   <button 
                    onClick={() => {
                      const entries = [];
                      for(let i=0; i<1000; i++) {
                        entries.push({ "@timestamp": new Date(Date.now() - i * 5000).toISOString(), "level": i % 15 === 0 ? "error" : i % 8 === 0 ? "warn" : "info", "message": `[Worker-${i%5}] 系统日志快照 #${i}: 任务分发正常，当前活跃连接数: ${Math.floor(Math.random() * 100)}`, "service": "back-end-service", "traceId": `tr-${Math.random().toString(36).substring(5)}` });
                      }
                      setLogs(parseLogs(entries.map(l => JSON.stringify(l)).join('\n')));
                    }}
                    className="px-10 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 rounded-full text-sm font-black transition-all text-white shadow-[0_10px_30px_rgba(6,182,212,0.3)] hover:shadow-cyan-500/50"
                   >
                     生成模拟数据
                   </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {detailView && (
        <DetailModal 
          title={detailView.title}
          content={detailView.content}
          onClose={() => setDetailView(null)}
          onExplain={() => {
            explainLogWithAI(detailView.log, detailView.content);
            setDetailView(null);
          }}
        />
      )}

      {aiAnalysis && (
        <div className="fixed bottom-8 right-8 w-[420px] max-h-[500px] bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-[0_30px_100px_rgba(0,0,0,0.7)] rounded-[2rem] flex flex-col animate-in slide-in-from-right-10 duration-500 z-[70]">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-cyan-500/5 rounded-t-[2rem]">
            <div className="flex items-center gap-2.5 text-cyan-400 font-black text-xs uppercase tracking-widest">
              <div className="p-1.5 bg-cyan-500/20 rounded-lg">
                <Sparkles size={16} />
              </div>
              Gemini AI 专家报告
            </div>
            <button onClick={() => setAiAnalysis(null)} className="text-slate-500 hover:text-slate-200 p-2 hover:bg-slate-800 rounded-full transition-all">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 overflow-y-auto text-sm text-slate-300 leading-relaxed font-medium no-scrollbar">
            {isAnalyzing ? (
              <div className="flex flex-col items-center py-16 gap-4 text-center">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                  <Sparkles size={20} className="absolute inset-0 m-auto text-cyan-400 animate-pulse" />
                </div>
                <div className="space-y-1">
                   <p className="text-cyan-400 font-black text-xs uppercase tracking-widest">诊断中...</p>
                   <p className="text-[10px] text-slate-500">正在分析上下文逻辑与异常堆栈</p>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in duration-700">
                {aiAnalysis.content}
              </div>
            )}
          </div>
          <div className="p-4 bg-slate-900 border-t border-slate-800 text-[9px] text-slate-600 font-bold flex items-center gap-2 justify-center rounded-b-[2rem]">
            <Info size={10} /> AI 生成内容仅供参考，请结合实际系统状态分析
          </div>
        </div>
      )}

      {isDragging && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center backdrop-blur-xl bg-cyan-500/10 transition-all duration-500">
          <div className="bg-slate-950/80 p-16 rounded-[4rem] shadow-2xl flex flex-col items-center gap-6 border-4 border-dashed border-cyan-500/30 scale-110">
             <div className="w-24 h-24 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 animate-bounce">
                <Upload size={48} />
             </div>
             <p className="text-2xl font-black text-white tracking-tight">释放以导入日志文件</p>
          </div>
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
