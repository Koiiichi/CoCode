import React, { useState } from 'react';
import { Send as SendIcon } from 'lucide-react';
const ChatPanel = () => {
  const [message, setMessage] = useState('');
  return <div className="w-72 border-l border-gray-700 flex flex-col bg-[#252526]">
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-6 w-6 rounded-full bg-gray-400 flex items-center justify-center text-xs font-medium text-gray-800 mr-2">
              AI
            </div>
            <span className="text-sm text-gray-300">Copilot AI (1.5.1)</span>
          </div>
          <button className="text-gray-400 hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="19" cy="12" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-4">
          <div className="text-sm text-gray-300 mb-1">
            Can you make this code more simple?
          </div>
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-sm text-white">
              Sure! Here you go, a simpler code for app.py:
            </p>
            <div className="mt-2 bg-gray-800 p-2 rounded text-xs font-mono text-gray-300 whitespace-pre overflow-x-auto">
              {`from flask import Flask, render_template
import numpy as np
from keras.models import load_model
app = Flask(__name__)
model_path = "models/model.h5"
model = load_model(model_path)
@app.route('/')
def index():
    return render_template('index.html')
@app.route('/predict', methods=['POST'])
def predict():
    # ... simplified code ...
    return predict`}
            </div>
          </div>
        </div>
      </div>
      <div className="p-3 border-t border-gray-700">
        <div className="flex items-center">
          <input type="text" className="flex-1 bg-gray-700 text-white rounded-l-md px-3 py-2 text-sm focus:outline-none" placeholder="Ask anything..." value={message} onChange={e => setMessage(e.target.value)} />
          <button className="bg-blue-500 hover:bg-blue-600 text-white rounded-r-md px-3 py-2">
            <SendIcon size={16} />
          </button>
        </div>
        <div className="flex justify-between mt-2 text-xs">
          <button className="text-gray-400 hover:text-gray-300">
            Clear chat
          </button>
          <button className="text-gray-400 hover:text-gray-300">Archive</button>
        </div>
      </div>
    </div>;
};
export default ChatPanel;