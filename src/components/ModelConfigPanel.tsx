import { useState, useEffect } from 'react';
import { LLMConfig, AVAILABLE_MODELS, DEFAULT_LLM_CONFIG } from '../services/agentService';
import '../styles/ModelConfigPanel.css';

interface ModelConfigPanelProps {
  llmConfig: LLMConfig;
  onConfigChange: (config: LLMConfig) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const ModelConfigPanel = ({ 
  llmConfig, 
  onConfigChange, 
  isExpanded, 
  onToggleExpand 
}: ModelConfigPanelProps) => {
  const [config, setConfig] = useState<LLMConfig>(llmConfig);
  
  // Update local state when props change
  useEffect(() => {
    setConfig(llmConfig);
  }, [llmConfig]);
  
  // Handle model change
  const handleModelChange = (modelId: string) => {
    const newConfig: LLMConfig = { 
      ...config, 
      model_id: modelId,
      model: modelId // Ensure both fields are set
    };
    
    setConfig(newConfig);
    onConfigChange(newConfig);
  };
  
  // Handle temperature change
  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const temperature = parseFloat(e.target.value);
    const newConfig = { ...config, temperature };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };
  
  // Handle reset to defaults
  const handleResetDefaults = () => {
    const newConfig = { ...DEFAULT_LLM_CONFIG };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };
  
  return (
    <div className="model-config-panel">
      <div className="model-config-header" onClick={onToggleExpand}>
        <div className="model-config-title">Chatbot Configurations</div>
        <div className={`model-config-icon ${isExpanded ? 'expanded' : ''}`}>
          {isExpanded ? '▼' : '▶'}
        </div>
      </div>
      
      <div className={`model-config-content ${isExpanded ? 'expanded' : ''}`}>
        <div className="config-section">
          <label>Provider</label>
          <div className="provider-info">
            <span className="provider-badge">OpenAI</span>
          </div>
        </div>
        
        <div className="config-section">
          <label>Model</label>
          <select 
            value={config.model_id || config.model} 
            onChange={(e) => handleModelChange(e.target.value)}
            className="model-select"
          >
            {AVAILABLE_MODELS.openai.map(model => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="config-section">
          <label>
            Temperature: {config.temperature?.toFixed(1)}
          </label>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.1" 
            value={config.temperature || 0.7} 
            onChange={handleTemperatureChange}
            className="temperature-slider"
          />
          <div className="slider-labels">
            <span>Precise</span>
            <span>Creative</span>
          </div>
        </div>
        
        <button 
          className="reset-button"
          onClick={handleResetDefaults}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

export default ModelConfigPanel; 