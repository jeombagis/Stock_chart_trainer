import { useEffect, useRef } from 'react';
import type React from 'react';
import { createChart, CandlestickSeries, ColorType } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';

export interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface ChartProps {
  visibleData: CandleData[];
  revealedData?: CandleData[];
  cutoffDate?: string;
  isAnswered?: boolean;
}

export const Chart: React.FC<ChartProps> = ({ 
  visibleData, 
  revealedData = [], 
  cutoffDate,
  isAnswered = false
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const visibleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const revealedSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 440,
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.6)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.6)' },
      },
      crosshair: {
        vertLine: {
          color: 'rgba(224, 227, 235, 0.4)',
          width: 1,
          style: 3,
        },
        horzLine: {
          color: 'rgba(224, 227, 235, 0.4)',
          width: 1,
          style: 3,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.4)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.4)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Past / Visible Candlestick Series (v5 API: chart.addSeries(CandlestickSeries, options))
    const visibleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#ef5350', // Red for up (Korean standard)
      downColor: '#26a69a', // Teal for down
      borderVisible: false,
      wickUpColor: '#ef5350',
      wickDownColor: '#26a69a',
    });

    // Revealed Future Candlestick Series (Golden / Highlighted styling)
    const revealedSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#ff7043',
      downColor: '#42a5f5',
      borderVisible: true,
      borderColor: '#ffd54f',
      wickUpColor: '#ff7043',
      wickDownColor: '#42a5f5',
    });

    visibleSeries.setData(visibleData);
    revealedSeries.setData(revealedData);

    chartRef.current = chart;
    visibleSeriesRef.current = visibleSeries;
    revealedSeriesRef.current = revealedSeries;

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        chartRef.current.timeScale().fitContent();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update visible and revealed data
  useEffect(() => {
    if (visibleSeriesRef.current && chartRef.current) {
      visibleSeriesRef.current.setData(visibleData);

      if (revealedSeriesRef.current) {
        revealedSeriesRef.current.setData(revealedData);
      }

      chartRef.current.timeScale().fitContent();
    }
  }, [visibleData, revealedData, cutoffDate, isAnswered]);

  return (
    <div className="chart-wrapper">
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-box past-box"></span>
          <span>노출 구간 (과거 {visibleData.length}일)</span>
        </div>
        {isAnswered && revealedData.length > 0 && (
          <div className="legend-item">
            <span className="legend-box future-box"></span>
            <span>공개된 후속 구간 (+{revealedData.length}일)</span>
          </div>
        )}
      </div>
      <div ref={chartContainerRef} style={{ width: '100%', height: '440px' }} />
    </div>
  );
};
