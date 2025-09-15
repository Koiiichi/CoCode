import React, { useState } from 'react';
import Sidebar from './Sidebar';
import CodeEditor from './CodeEditor';
import ChatPanel from './ChatPanel';
import TabBar from './TabBar';
import StatusBar from './StatusBar';
const CodeEditorLayout = () => {
  const [activeFile, setActiveFile] = useState('game-addiction-classification.py');
  // Sample Python code that mimics what's shown in the image
  const sampleCode = `from flask import Flask, render_template, request, send_file
import numpy as np
import pandas as pd
import keras
from keras.models import load_model
from sklearn.model_selection import train_test_split
from keras.layers import Dense, Dropout
from keras.layers import Flatten, Dropout
from keras.layers.convolutional import Conv2D, MaxPooling2D
from sklearn.model_selection import train_test_split
app = Flask(__name__)
model_path = "models/model.h5"
model = load_model(model_path)
@app.route('/')
def index():
    return render_template('index.html')
# Classification process
@app.route('/predict', methods=['POST'])
def predict():
    if request.method == "POST":
        age1 = request.form['age']
        sex1 = request.form['sex']
        grade1 = request.form['grade']
        points1 = request.form['points1']
        points2 = request.form['points2']
        points3 = request.form['points3']
        df = pd.DataFrame(data=[[age1, sex1, age1, points1, points2, points3]],
                         columns=['age', 'sex', 'points1', 'points2', 'points3'])
        test = np.array([df])
        test = test.reshape((test.shape[0], test.shape[1], 1))
        labels = {
            0: "No",
            1: "Yes",
        }`;
  return <div className="flex flex-col h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-blue-400">
      <div className="flex-1 flex overflow-hidden rounded-lg m-4 shadow-xl bg-[#1e1e1e]">
        <Sidebar activeFile={activeFile} setActiveFile={setActiveFile} />
        <div className="flex flex-col flex-1">
          <TabBar activeFile={activeFile} />
          <div className="flex-1 flex">
            <CodeEditor code={sampleCode} />
            <ChatPanel />
          </div>
          <StatusBar />
        </div>
      </div>
    </div>;
};
export default CodeEditorLayout;