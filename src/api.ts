import axios from 'axios';

interface WeatherData {
  dt: number;
  temp: {
    day: number;
    min: number;
    max: number;
  };
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  }[];
}

export interface ForecastItem {
  date: string;
  day: {
    avgtemp_c: number;
    mintemp_c: number;
    maxtemp_c: number;
    condition: {
      text: string;
      icon: string;
    };
  };
}

export interface ForecastResponse {
  daily: WeatherData[];
}

const getWeatherText = (code: number) => {
  // WMO天气代码转文字描述
  const weatherMap: { [key: number]: string } = {
    0: '晴',
    1: '晴',
    2: '局部多云',
    3: '多云',
    45: '雾',
    48: '冻雾',
    51: '小雨',
    53: '中雨',
    55: '大雨',
    56: '冻雨',
    57: '冻雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    66: '冰雹',
    67: '冰雹',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    77: '冰晶',
    80: '阵雨',
    81: '强阵雨',
    82: '暴雨',
    85: '阵雪',
    86: '暴雪',
    95: '雷雨',
    96: '雷暴',
    99: '强雷暴'
  };
  return weatherMap[code] || '未知天气';
};

const getWeatherIcon = (code: number) => {
  // WMO天气代码转本地图标路径
  const iconMap: { [key: number]: string } = {
    0: 'sunny',
    1: 'sunny',
    2: 'partly-cloudy',
    3: 'cloudy',
    45: 'fog',
    48: 'fog',
    51: 'rain',
    53: 'rain',
    55: 'rain',
    56: 'sleet',
    57: 'sleet',
    61: 'rain',
    63: 'rain',
    65: 'rain',
    66: 'hail',
    67: 'hail',
    71: 'snow',
    73: 'snow',
    75: 'snow',
    77: 'snow',
    80: 'rain',
    81: 'rain',
    82: 'rain',
    85: 'snow',
    86: 'snow',
    95: 'thunderstorm',
    96: 'thunderstorm',
    99: 'thunderstorm'
  };
  return `${iconMap[code] || 'unknown'}.svg`;
};

interface Coordinates {
  lat: number;
  lon: number;
}

const getCoordinates = async (city: string): Promise<Coordinates> => {
  let retries = 3;
  
  while (retries--) {
    try {
      const key = import.meta.env.VITE_GAODE_API_KEY;
      if (!key) {
        throw new Error('高德API密钥未配置');
      }

      const response = await axios.get(
        'https://restapi.amap.com/v3/geocode/geo', {
          params: {
            address: city,
            key: key
          }
        }
      );

      // 优先匹配城市级别结果
      if (response.data.status !== '1') {
        throw new Error(`高德API错误：${response.data.info}`);
      }

      const [lon, lat] = response.data.geocodes[0]?.location?.split(',').map(Number) || [];
      if (!lat || !lon) {
        throw new Error('无法解析坐标');
      }

      return { lat, lon };
    } catch (error) {
      if (retries === 0) {
        throw new Error(`无法获取坐标：${error instanceof Error ? error.message : '未知错误'}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('请求超时，请检查网络连接');
};

export const getWeeklyForecast = async (city: string): Promise<ForecastItem[]> => {
  try {
    const { lat, lon } = await getCoordinates(city);
    const forecastResponse = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
    );

    return forecastResponse.data.daily.time.map((time, index) => ({
      date: time,
      day: {
        avgtemp_c: (forecastResponse.data.daily.temperature_2m_max[index] + forecastResponse.data.daily.temperature_2m_min[index]) / 2,
        mintemp_c: forecastResponse.data.daily.temperature_2m_min[index],
        maxtemp_c: forecastResponse.data.daily.temperature_2m_max[index],
        condition: {
          text: getWeatherText(forecastResponse.data.daily.weather_code[index]),
          icon: getWeatherIcon(forecastResponse.data.daily.weather_code[index])
        }
      }
    }));
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw new Error('Failed to fetch weather data');
  }
};