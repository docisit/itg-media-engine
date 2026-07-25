'use client';

import { useState, useEffect } from 'react';

interface QualityMetric {
  label: string;
  value: number;
  unit: string;
  goodThreshold: number;
  warningThreshold: number;
  currentValue: number;
  trend: 'up' | 'down' | 'stable';
}

export default function QualityMonitor() {
  const [metrics, setMetrics] = useState<QualityMetric[]>([
    {
      label: 'Latency',
      value: 45,
      unit: 'ms',
      goodThreshold: 50,
      warningThreshold: 100,
      currentValue: 45,
      trend: 'stable'
    },
    {
      label: 'Packet Loss',
      value: 0.2,
      unit: '%',
      goodThreshold: 1,
      warningThreshold: 5,
      currentValue: 0.2,
      trend: 'stable'
    },
    {
      label: 'Jitter',
      value: 12,
      unit: 'ms',
      goodThreshold: 20,
      warningThreshold: 50,
      currentValue: 12,
      trend: 'stable'
    },
    {
      label: 'Bandwidth',
      value: 5.2,
      unit: 'Mbps',
      goodThreshold: 2,
      warningThreshold: 1,
      currentValue: 5.2,
      trend: 'stable'
    }
  ]);

  const [connectionType, setConnectionType] = useState<'direct' | 'relay' | 'unknown'>('relay');
  const [iceState, setIceState] = useState<string>('connected');
  const [overallQuality, setOverallQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');

  // Simulate real-time metric updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(metric => {
        // Add small random variations to simulate real network conditions
        const variation = (Math.random() - 0.5) * (metric.label === 'Latency' ? 10 : metric.label === 'Bandwidth' ? 0.5 : 0.3);
        const newValue = Math.max(0.1, metric.value + variation);
        
        // Determine trend
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (newValue > metric.currentValue * 1.1) trend = 'up';
        else if (newValue < metric.currentValue * 0.9) trend = 'down';
        
        return {
          ...metric,
          currentValue: newValue,
          trend
        };
      }));

      // Randomly change connection type occasionally
      if (Math.random() > 0.95) {
        setConnectionType(Math.random() > 0.5 ? 'direct' : 'relay');
      }

      // Update ICE state
      const iceStates = ['connected', 'checking', 'completed', 'disconnected'];
      if (Math.random() > 0.98) {
        setIceState(iceStates[Math.floor(Math.random() * iceStates.length)]);
      }

    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Calculate overall quality based on metrics
  useEffect(() => {
    // Use requestAnimationFrame to avoid synchronous state updates
    const updateQuality = () => {
      const poorMetrics = metrics.filter(m => 
        m.currentValue > m.warningThreshold || 
        (m.label === 'Bandwidth' && m.currentValue < m.warningThreshold)
      ).length;

      const fairMetrics = metrics.filter(m => 
        m.currentValue > m.goodThreshold || 
        (m.label === 'Bandwidth' && m.currentValue < m.goodThreshold)
      ).length;

      if (poorMetrics > 0) {
        setOverallQuality('poor');
      } else if (fairMetrics > 0) {
        setOverallQuality('fair');
      } else if (metrics.every(m => 
        m.currentValue < m.goodThreshold * 0.7 ||
        (m.label === 'Bandwidth' && m.currentValue > m.goodThreshold * 1.5)
      )) {
        setOverallQuality('excellent');
      } else {
        setOverallQuality('good');
      }
    };

    requestAnimationFrame(updateQuality);
  }, [metrics]);

  const getQualityColor = (metric: QualityMetric) => {
    if (metric.label === 'Bandwidth') {
      if (metric.currentValue >= metric.goodThreshold) return 'text-green-400';
      if (metric.currentValue >= metric.warningThreshold) return 'text-yellow-400';
      return 'text-red-400';
    } else {
      if (metric.currentValue <= metric.goodThreshold) return 'text-green-400';
      if (metric.currentValue <= metric.warningThreshold) return 'text-yellow-400';
      return 'text-red-400';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      case 'stable': return '→';
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', metric: QualityMetric) => {
    if (trend === 'stable') return 'text-gray-400';
    
    if (metric.label === 'Bandwidth') {
      return trend === 'up' ? 'text-green-400' : 'text-red-400';
    } else {
      return trend === 'down' ? 'text-green-400' : 'text-red-400';
    }
  };

  const getOverallQualityColor = () => {
    switch (overallQuality) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-cyan-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
    }
  };

  const getConnectionTypeColor = () => {
    switch (connectionType) {
      case 'direct': return 'text-green-400';
      case 'relay': return 'text-cyan-400';
      case 'unknown': return 'text-yellow-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Quality Indicator */}
      <div className="text-center p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
        <div className="text-sm text-zinc-500 uppercase tracking-widest mb-1">Overall Quality</div>
        <div className={`text-3xl font-black ${getOverallQualityColor()}`}>
          {overallQuality.toUpperCase()}
        </div>
        <div className="text-xs text-zinc-600 mt-2">
          {connectionType === 'direct' ? 'Direct peer connection' : 'TURN relay connection'}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="space-y-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-zinc-300">{metric.label}</span>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-mono ${getQualityColor(metric)}`}>
                  {metric.currentValue.toFixed(metric.label === 'Packet Loss' ? 1 : 0)}
                </span>
                <span className="text-xs text-zinc-500">{metric.unit}</span>
                <span className={`text-xs ${getTrendColor(metric.trend, metric)}`}>
                  {getTrendIcon(metric.trend)}
                </span>
              </div>
            </div>
            
            {/* Quality Bar */}
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  getQualityColor(metric).replace('text-', 'bg-')
                }`}
                style={{ 
                  width: `${Math.min(100, 
                    metric.label === 'Bandwidth' 
                      ? (metric.currentValue / 10) * 100 
                      : (metric.currentValue / metric.warningThreshold) * 100
                  )}%` 
                }}
              ></div>
            </div>
            
            {/* Threshold Indicators */}
            <div className="flex justify-between text-xs text-zinc-600">
              <span>Good: less than {metric.goodThreshold}{metric.unit}</span>
              <span>Warning: less than {metric.warningThreshold}{metric.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Connection Details */}
      <div className="pt-4 border-t border-zinc-800 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Connection Type:</span>
          <span className={`text-sm font-mono ${getConnectionTypeColor()}`}>
            {connectionType.toUpperCase()}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">ICE State:</span>
          <span className="text-sm font-mono text-cyan-400">{iceState}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">TURN Server:</span>
          <span className="text-sm font-mono text-green-400">Active ✓</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">WebRTC Version:</span>
          <span className="text-sm font-mono text-zinc-300">ORTC</span>
        </div>
      </div>

      {/* Recommendations */}
      {overallQuality === 'poor' && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-800/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-red-400">⚠️</span>
            <span className="text-sm font-medium text-red-300">Connection Issues Detected</span>
          </div>
          <p className="text-xs text-red-400/80">
            Check your network connection and try moving closer to your router.
          </p>
        </div>
      )}

      {overallQuality === 'fair' && (
        <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-800/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-yellow-400">ℹ️</span>
            <span className="text-sm font-medium text-yellow-300">Fair Connection</span>
          </div>
          <p className="text-xs text-yellow-400/80">
            Connection is stable but could be improved. Consider closing other bandwidth-intensive applications.
          </p>
        </div>
      )}
    </div>
  );
}