import { useState, useEffect } from 'react';
import { LLMConfig, ReasoningEffort, AVAILABLE_MODELS, DEFAULT_LLM_CONFIG } from '../services/agentService';
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
  
  // Determine if reasoning effort should be enabled
  const isReasoningEffortEnabled = () => {
    return config.provider === 'openai' && 
           (config.model_id === 'o3-mini' || config.model_id === 'o1');
  };
  
  // Determine if think mode should be enabled
  const isThinkModeEnabled = () => {
    return config.provider === 'anthropic' && 
           config.model_id === 'claude-3-7-sonnet';
  };
  
  // Determine if temperature should be fixed
  const isTemperatureFixed = () => {
    return config.model_id === 'o1' || 
           config.model_id === 'o3-mini' || 
           config.model_id === 'claude-3-7-sonnet';
  };
  
  // Handle provider change
  const handleProviderChange = (provider: string) => {
    // When provider changes, select the first model from that provider
    const newModelId = AVAILABLE_MODELS[provider as keyof typeof AVAILABLE_MODELS][0].id;
    
    // Create new configuration
    let newConfig: LLMConfig = { ...config, provider, model_id: newModelId };
    
    // Apply default values based on model
    if (provider === 'openai') {
      if (newModelId !== 'o3-mini' && newModelId !== 'o1') {
        newConfig.reasoning_effort = 'low';
      }
      // When switching to OpenAI, think_mode should be false
      newConfig.think_mode = false;
    }
    
    // Set fixed temperature for specific models
    if (newModelId === 'o1' || newModelId === 'o3-mini' || newModelId === 'claude-3-7-sonnet') {
      newConfig.temperature = 1.0;
    }
    
    setConfig(newConfig);
    onConfigChange(newConfig);
  };
  
  // Handle model change
  const handleModelChange = (modelId: string) => {
    let newConfig: LLMConfig = { ...config, model_id: modelId };
    
    // Apply default values based on model
    if (config.provider === 'openai') {
      if (modelId !== 'o3-mini' && modelId !== 'o1') {
        newConfig.reasoning_effort = 'low';
      }
    }
    
    if (config.provider === 'anthropic') {
      if (modelId !== 'claude-3-7-sonnet') {
        newConfig.think_mode = false;
      }
    }
    
    // Set fixed temperature for specific models
    if (modelId === 'o1' || modelId === 'o3-mini' || modelId === 'claude-3-7-sonnet') {
      newConfig.temperature = 1.0;
    }
    
    setConfig(newConfig);
    onConfigChange(newConfig);
  };
  
  // Handle reasoning effort change
  const handleReasoningEffortChange = (effort: ReasoningEffort) => {
    // Only allow changes if reasoning effort is enabled
    if (!isReasoningEffortEnabled()) return;
    
    const newConfig = { ...config, reasoning_effort: effort };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };
  
  // Handle think mode toggle
  const handleThinkModeToggle = () => {
    // Only allow changes if think mode is enabled
    if (!isThinkModeEnabled()) return;
    
    const newConfig = { ...config, think_mode: !config.think_mode };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };
  
  // Handle temperature change
  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Do not allow temperature changes for fixed models
    if (isTemperatureFixed()) return;
    
    const temperature = parseFloat(e.target.value);
    const newConfig = { ...config, temperature };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };
  
  // Handle reset to defaults
  const handleResetDefaults = () => {
    let newConfig = { ...DEFAULT_LLM_CONFIG };
    
    // Ensure fixed temperature for specific models
    if (isTemperatureFixed()) {
      newConfig.temperature = 1.0;
    }
    
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
          <div className="provider-buttons">
            <button 
              className={`provider-button ${config.provider === 'openai' ? 'active' : ''}`}
              onClick={() => handleProviderChange('openai')}
            >
              OpenAI
            </button>
            <button 
              className={`provider-button ${config.provider === 'anthropic' ? 'active' : ''}`}
              onClick={() => handleProviderChange('anthropic')}
            >
              Anthropic
            </button>
          </div>
        </div>
        
        <div className="config-section">
          <label>Model</label>
          <select 
            value={config.model_id} 
            onChange={(e) => handleModelChange(e.target.value)}
            className="model-select"
          >
            {AVAILABLE_MODELS[config.provider as keyof typeof AVAILABLE_MODELS].map(model => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
        
        {config.provider === 'openai' && (
          <div className="config-section">
            <label>Reasoning Effort</label>
            <div className={`reasoning-buttons ${!isReasoningEffortEnabled() ? 'disabled' : ''}`}>
              <button 
                className={`reasoning-button ${config.reasoning_effort === 'low' ? 'active' : ''}`}
                onClick={() => handleReasoningEffortChange('low')}
                disabled={!isReasoningEffortEnabled()}
              >
                Low
              </button>
              <button 
                className={`reasoning-button ${config.reasoning_effort === 'medium' ? 'active' : ''}`}
                onClick={() => handleReasoningEffortChange('medium')}
                disabled={!isReasoningEffortEnabled()}
              >
                Medium
              </button>
              <button 
                className={`reasoning-button ${config.reasoning_effort === 'high' ? 'active' : ''}`}
                onClick={() => handleReasoningEffortChange('high')}
                disabled={!isReasoningEffortEnabled()}
              >
                High
              </button>
            </div>
          </div>
        )}
        
        {config.provider === 'anthropic' && (
          <div className="config-section">
            <label>Think Mode</label>
            <div className={`toggle-switch ${!isThinkModeEnabled() ? 'disabled' : ''}`}>
              <input 
                type="checkbox" 
                id="think-mode" 
                checked={config.think_mode} 
                onChange={handleThinkModeToggle}
                disabled={!isThinkModeEnabled()}
              />
              <label htmlFor="think-mode" className="toggle-label"></label>
            </div>
          </div>
        )}
        
        <div className="config-section">
          <label>Temperature: {isTemperatureFixed() ? '1.0 (Fixo)' : config.temperature?.toFixed(1)}</label>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.1" 
            value={isTemperatureFixed() ? 1.0 : config.temperature} 
            onChange={handleTemperatureChange}
            className={`temperature-slider ${isTemperatureFixed() ? 'disabled' : ''}`}
            disabled={isTemperatureFixed()}
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