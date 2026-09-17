import { useEffect, useRef } from 'react';
import type React from 'react';
import { 
  createChart, 
  CandlestickSeries, 
  LineSeries, 
  HistogramSeries, 
  ColorType 
} from 'lightweight-charts';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { 
  calculateSMA, 
  calculateBollingerBands, 
  getVolumeData, 
  calculateRSI 
} from './utils/indicators';

export interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface IndicatorsConfig {
  bollingerBands: boolean;
  sma5: boolean;
  sma20: boolean;
  sma60: boolean;
  sma120: boolean;
  volume: boolean;
  rsi: boolean;
}

interface ChartProps {
  visibleData: CandleData[];
  revealedData?: CandleData[];
  cutoffDate?: string;
  isAnswered?: boolean;
  indicators: IndicatorsConfig;
}

export const Chart: React.FC<ChartProps> = ({ 
  visibleData, 
  revealedData = [], 
  cutoffDate,
  isAnswered = false,
  indicators
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Series refs
  const visibleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const revealedSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // Indicator series refs
  const bbUpperRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<"Line"> | null>(null);

  const sma5Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const sma20Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const sma60Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const sma120Ref = useRef<ISeriesApi<"Line"> | null>(null);

  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 480,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6e6e73',
      },
      grid: {
        vertLines: { color: 'rgba(0, 0, 0, 0.05)' },
        horzLines: { color: 'rgba(0, 0, 0, 0.05)' },
      },
      crosshair: {
        vertLine: {
          color: 'rgba(0, 0, 0, 0.25)',
          width: 1,
          style: 3,
        },
        horzLine: {
          color: 'rgba(0, 0, 0, 0.25)',
          width: 1,
          style: 3,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(0, 0, 0, 0.08)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2, // Leave bottom room for Volume
        },
      },
      timeScale: {
        borderColor: 'rgba(0, 0, 0, 0.08)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // 1. Volume Histogram (Background bottom)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume_scale',
      color: 'rgba(2, 132, 199, 0.35)',
    });
    chart.priceScale('volume_scale').applyOptions({
      scaleMargins: {
        top: 0.8, // lower 20%
        bottom: 0,
      },
    });

    // 2. Main Candlesticks (Visible Past)
    const visibleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#e02424', // Apple Vibrant Red (Korean Standard)
      downColor: '#059669', // Apple Vibrant Teal/Green
      borderVisible: false,
      wickUpColor: '#e02424',
      wickDownColor: '#059669',
    });

    // 3. Revealed Candlesticks (Future Highlight)
    const revealedSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#f97316',
      downColor: '#0284c7',
      borderVisible: true,
      borderColor: '#eab308',
      wickUpColor: '#f97316',
      wickDownColor: '#0284c7',
    });

    // 4. Bollinger Bands (20, 2)
    const bbUpper = chart.addSeries(LineSeries, {
      color: '#9333ea', // Apple Purple
      lineWidth: 1,
      lineStyle: 2, // Dashed
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const bbMiddle = chart.addSeries(LineSeries, {
      color: '#c084fc', // Soft Purple
      lineWidth: 1,
      lineStyle: 0,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const bbLower = chart.addSeries(LineSeries, {
      color: '#9333ea',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    // 5. Moving Averages (5, 20, 60, 120)
    const sma5 = chart.addSeries(LineSeries, {
      color: '#059669', // Green (5d)
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const sma20 = chart.addSeries(LineSeries, {
      color: '#d97706', // Amber (20d)
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const sma60 = chart.addSeries(LineSeries, {
      color: '#e11d48', // Rose Pink (60d)
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const sma120 = chart.addSeries(LineSeries, {
      color: '#0284c7', // Blue (120d)
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    // 6. RSI (14)
    const rsiSeries = chart.addSeries(LineSeries, {
      color: '#ea580c', // Orange
      lineWidth: 2,
      priceScaleId: 'rsi_scale',
      priceLineVisible: false,
      lastValueVisible: false,
    });
    chart.priceScale('rsi_scale').applyOptions({
      scaleMargins: {
        top: 0.85,
        bottom: 0.02,
      },
    });

    chartRef.current = chart;
    visibleSeriesRef.current = visibleSeries;
    revealedSeriesRef.current = revealedSeries;
    volumeSeriesRef.current = volumeSeries;

    bbUpperRef.current = bbUpper;
    bbMiddleRef.current = bbMiddle;
    bbLowerRef.current = bbLower;

    sma5Ref.current = sma5;
    sma20Ref.current = sma20;
    sma60Ref.current = sma60;
    sma120Ref.current = sma120;

    rsiSeriesRef.current = rsiSeries;

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

  // Update Data and Indicators
  useEffect(() => {
    if (!chartRef.current || !visibleSeriesRef.current) return;

    // Active full series data (past + revealed if answered)
    const activeCandles = isAnswered && revealedData.length > 0 
      ? [...visibleData, ...revealedData] 
      : visibleData;

    // 1. Candlestick series
    visibleSeriesRef.current.setData(visibleData);
    if (revealedSeriesRef.current) {
      revealedSeriesRef.current.setData(isAnswered ? revealedData : []);
    }

    // 2. Volume
    if (volumeSeriesRef.current) {
      if (indicators.volume && activeCandles.length > 0) {
        volumeSeriesRef.current.setData(getVolumeData(activeCandles));
        volumeSeriesRef.current.applyOptions({ visible: true });
      } else {
        volumeSeriesRef.current.setData([]);
        volumeSeriesRef.current.applyOptions({ visible: false });
      }
    }

    // 3. Bollinger Bands (20, 2)
    if (bbUpperRef.current && bbMiddleRef.current && bbLowerRef.current) {
      if (indicators.bollingerBands && activeCandles.length >= 20) {
        const bb = calculateBollingerBands(activeCandles, 20, 2);
        bbUpperRef.current.setData(bb.upper);
        bbMiddleRef.current.setData(bb.middle);
        bbLowerRef.current.setData(bb.lower);
        bbUpperRef.current.applyOptions({ visible: true });
        bbMiddleRef.current.applyOptions({ visible: true });
        bbLowerRef.current.applyOptions({ visible: true });
      } else {
        bbUpperRef.current.setData([]);
        bbMiddleRef.current.setData([]);
        bbLowerRef.current.setData([]);
        bbUpperRef.current.applyOptions({ visible: false });
        bbMiddleRef.current.applyOptions({ visible: false });
        bbLowerRef.current.applyOptions({ visible: false });
      }
    }

    // 4. Moving Averages
    if (sma5Ref.current) {
      if (indicators.sma5 && activeCandles.length >= 5) {
        sma5Ref.current.setData(calculateSMA(activeCandles, 5));
        sma5Ref.current.applyOptions({ visible: true });
      } else {
        sma5Ref.current.setData([]);
        sma5Ref.current.applyOptions({ visible: false });
      }
    }

    if (sma20Ref.current) {
      if (indicators.sma20 && activeCandles.length >= 20) {
        sma20Ref.current.setData(calculateSMA(activeCandles, 20));
        sma20Ref.current.applyOptions({ visible: true });
      } else {
        sma20Ref.current.setData([]);
        sma20Ref.current.applyOptions({ visible: false });
      }
    }

    if (sma60Ref.current) {
      if (indicators.sma60 && activeCandles.length >= 60) {
        sma60Ref.current.setData(calculateSMA(activeCandles, 60));
        sma60Ref.current.applyOptions({ visible: true });
      } else {
        sma60Ref.current.setData([]);
        sma60Ref.current.applyOptions({ visible: false });
      }
    }

    if (sma120Ref.current) {
      if (indicators.sma120 && activeCandles.length >= 120) {
        sma120Ref.current.setData(calculateSMA(activeCandles, 120));
        sma120Ref.current.applyOptions({ visible: true });
      } else {
        sma120Ref.current.setData([]);
        sma120Ref.current.applyOptions({ visible: false });
      }
    }

    // 5. RSI (14)
    if (rsiSeriesRef.current) {
      if (indicators.rsi && activeCandles.length >= 15) {
        rsiSeriesRef.current.setData(calculateRSI(activeCandles, 14));
        rsiSeriesRef.current.applyOptions({ visible: true });
      } else {
        rsiSeriesRef.current.setData([]);
        rsiSeriesRef.current.applyOptions({ visible: false });
      }
    }

    chartRef.current.timeScale().fitContent();
  }, [visibleData, revealedData, cutoffDate, isAnswered, indicators]);

  return (
    <div className="chart-wrapper">
      {/* Dynamic Indicators Legend */}
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-box past-box"></span>
          <span>과거 {visibleData.length}일</span>
        </div>
        {isAnswered && revealedData.length > 0 && (
          <div className="legend-item">
            <span className="legend-box future-box"></span>
            <span>공개 후속 구간 (+{revealedData.length}일)</span>
          </div>
        )}
        {indicators.bollingerBands && (
          <div className="legend-item text-bb">
            <span className="legend-line line-bb"></span>
            <span>BB(20, 2)</span>
          </div>
        )}
        {indicators.sma5 && (
          <div className="legend-item text-sma5">
            <span className="legend-line line-sma5"></span>
            <span>MA5</span>
          </div>
        )}
        {indicators.sma20 && (
          <div className="legend-item text-sma20">
            <span className="legend-line line-sma20"></span>
            <span>MA20</span>
          </div>
        )}
        {indicators.sma60 && (
          <div className="legend-item text-sma60">
            <span className="legend-line line-sma60"></span>
            <span>MA60</span>
          </div>
        )}
        {indicators.sma120 && (
          <div className="legend-item text-sma120">
            <span className="legend-line line-sma120"></span>
            <span>MA120</span>
          </div>
        )}
        {indicators.volume && (
          <div className="legend-item text-vol">
            <span className="legend-box vol-box"></span>
            <span>거래량</span>
          </div>
        )}
        {indicators.rsi && (
          <div className="legend-item text-rsi">
            <span className="legend-line line-rsi"></span>
            <span>RSI(14)</span>
          </div>
        )}
      </div>

      <div ref={chartContainerRef} style={{ width: '100%', height: '480px' }} />
    </div>
  );
};
