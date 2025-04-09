import { useState, useCallback, useRef, useEffect } from 'react'
import { ForecastItem, getWeeklyForecast } from './api'
import './App.css'

interface WeatherCardProps {
  date: Date;
  temp: number;
  min: number;
  max: number;
  description: string;
  icon: string;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ date, temp, min, max, description, icon }) => (
  <div className="weather-card">
    <h3>{date.toLocaleDateString('zh-CN', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
    <div className="temp-container">
      <span className="current-temp">{temp}°C</span>
      <div className="temp-range">
        <span className="max-temp">{max}°</span>
        <span className="min-temp">{min}°</span>
      </div>
    </div>
    <p className="description">{description}</p>
  </div>
);

function App() {
  const [city, setCity] = useState('上海');
  const [forecast, setForecast] = useState<WeatherCardProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
    console.log('开始获取数据，城市:', city);
      try {
        setLoading(true);
        setError('');
        const data: ForecastItem[] = await getWeeklyForecast(city);
        setForecast(data.map((item: ForecastItem) => ({
          date: new Date(item.date),
          temp: Math.round(item.day.avgtemp_c),
          min: Math.round(item.day.mintemp_c),
          max: Math.round(item.day.maxtemp_c),
          description: item.day.condition.text,
          icon: item.day.condition.icon
        })));
      } catch (err) {
        console.error('获取数据失败:', err);
        setError('无法获取天气数据，请检查城市名称或稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [city]);

  return (
    <div className="app-container">
      <div className="header">
        <h1>7日天气预报</h1>
        <div className="city-selector">
          <CitySelector value={city} onSearch={(value) => setCity(value)} />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <div className="weather-grid">
          {forecast.map((weather, index) => (
            <WeatherCard key={index} {...weather} />
          ))}
        </div>
      )}
    </div>
  );
}

export default App

function CitySelector({ value: initialValue = '', onSearch }) {
  const [inputValue, setInputValue] = useState(initialValue);

  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedSearch = useCallback(
    (value: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
      timeoutRef.current = setTimeout(() => {
        onSearch(value);
      }, 500);
    },
    [onSearch]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('输入变化:', e.target.value);
    const value = e.target.value;
    setInputValue(value);
    debouncedSearch(value);
  };

  return (
    <input
      type="text"
      value={inputValue}
      onChange={handleInputChange}
      placeholder="输入城市名称"
    />
  );
}
