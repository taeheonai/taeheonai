import React from 'react';
import { WeightConfig, DEFAULT_WEIGHTS } from '../../../types/weights';

interface WeightSettingsPanelProps {
  weights: WeightConfig;
  onChange: (newWeights: WeightConfig) => void;
  onReset: () => void;
  isLoading?: boolean;
}

const WeightSettingsPanel: React.FC<WeightSettingsPanelProps> = ({
  weights,
  onChange,
  onReset,
  isLoading = false
}) => {
  const handleWeightChange = (
    category: keyof WeightConfig,
    value: number,
    isBoost: boolean = false,
    boostType?: 'frequency' | 'relevance'
  ) => {
    const newWeights = { ...weights };
    
    if (isBoost && boostType && category === 'negative') {
      newWeights.negative.boost[boostType] = value;
    } else {
      (newWeights[category] as any).value = value;
    }
    
    onChange(newWeights);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">
            ⚖️ 가중치 설정
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            각 요소별 가중치를 조정하여 중대성 평가 결과를 커스터마이즈할 수 있습니다.
          </p>
        </div>
        <button
          onClick={onReset}
          disabled={isLoading}
          className={`px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
            isLoading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          기본값으로 초기화
        </button>
      </div>

      <div className="space-y-6">
        {(Object.entries(weights) as [string, any][]).map(([key, config]) => (
          <div key={key} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                {key === 'frequency' && '빈도 가중치'}
                {key === 'relevance' && '관련성 가중치'}
                {key === 'recent' && '최신성 가중치'}
                {key === 'rank' && '순위 가중치'}
                {key === 'negative' && '부정성 가중치'}
              </label>
              <span className="text-sm font-mono bg-white px-2 py-1 rounded border">
                {(config as any).value.toFixed(2)}
              </span>
            </div>
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={(config as any).value}
              onChange={(e) => handleWeightChange(key as keyof WeightConfig, parseFloat(e.target.value))}
              disabled={isLoading}
              className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
            
            <p className="mt-2 text-sm text-gray-600">
              {(config as any).description}
            </p>

            {key === 'negative' && (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      빈도 부스트
                    </label>
                    <span className="text-sm font-mono bg-white px-2 py-1 rounded border">
                      {config.boost.frequency.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={config.boost.frequency}
                    onChange={(e) => handleWeightChange('negative', parseFloat(e.target.value), true, 'frequency')}
                    disabled={isLoading}
                    className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${
                      isLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      관련성 부스트
                    </label>
                    <span className="text-sm font-mono bg-white px-2 py-1 rounded border">
                      {config.boost.relevance.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={config.boost.relevance}
                    onChange={(e) => handleWeightChange('negative', parseFloat(e.target.value), true, 'relevance')}
                    disabled={isLoading}
                    className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${
                      isLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">
          💡 가중치 설정 도움말
        </h4>
        <ul className="text-sm text-blue-700 space-y-2">
          <li>• 각 가중치는 0.0에서 1.0 사이의 값을 가질 수 있습니다.</li>
          <li>• 부정성 가중치는 빈도와 관련성에 대한 부스트 효과가 추가됩니다.</li>
          <li>• 가중치 변경 시 실시간으로 결과가 업데이트됩니다.</li>
          <li>• 기본값으로 초기화하면 시스템 기본 가중치가 적용됩니다.</li>
        </ul>
      </div>
    </div>
  );
};

export default WeightSettingsPanel;
