export interface BrainActivationState {
  inputs: number[];
  hidden: number[];
  outputs: number[];
  weightsIH: number[][]; // [hidden][input]
  weightsHO: number[][]; // [output][hidden]
}

export class NeuralNetwork {
  inputSize: number;
  hiddenSize: number;
  outputSize: number;

  weightsIH: Float32Array; // input to hidden: hiddenSize * inputSize
  biasH: Float32Array;     // hidden biases: hiddenSize
  weightsHO: Float32Array; // hidden to output: outputSize * hiddenSize
  biasO: Float32Array;     // output biases: outputSize

  // Cache for visualizer
  lastState: BrainActivationState | null = null;

  constructor(inputSize: number, hiddenSize: number, outputSize: number) {
    this.inputSize = inputSize;
    this.hiddenSize = hiddenSize;
    this.outputSize = outputSize;

    this.weightsIH = new Float32Array(hiddenSize * inputSize);
    this.biasH = new Float32Array(hiddenSize);
    this.weightsHO = new Float32Array(outputSize * hiddenSize);
    this.biasO = new Float32Array(outputSize);

    this.randomize();
  }

  randomize(): void {
    // Xavier / Glorot initialization
    const scaleIH = Math.sqrt(2.0 / (this.inputSize + this.hiddenSize));
    for (let i = 0; i < this.weightsIH.length; i++) {
      this.weightsIH[i] = (Math.random() * 2 - 1) * scaleIH;
    }
    for (let i = 0; i < this.biasH.length; i++) {
      this.biasH[i] = (Math.random() * 2 - 1) * 0.1;
    }

    const scaleHO = Math.sqrt(2.0 / (this.hiddenSize + this.outputSize));
    for (let i = 0; i < this.weightsHO.length; i++) {
      this.weightsHO[i] = (Math.random() * 2 - 1) * scaleHO;
    }
    for (let i = 0; i < this.biasO.length; i++) {
      this.biasO[i] = (Math.random() * 2 - 1) * 0.1;
    }
  }

  forward(inputs: number[], captureState = false): number[] {
    const hidden = new Float32Array(this.hiddenSize);

    // Hidden layer
    for (let h = 0; h < this.hiddenSize; h++) {
      let sum = this.biasH[h];
      const offset = h * this.inputSize;
      for (let i = 0; i < this.inputSize; i++) {
        sum += (inputs[i] || 0) * this.weightsIH[offset + i];
      }
      // Tanh activation
      hidden[h] = Math.tanh(sum);
    }

    // Output layer
    const outputs = new Array(this.outputSize);
    for (let o = 0; o < this.outputSize; o++) {
      let sum = this.biasO[o];
      const offset = o * this.hiddenSize;
      for (let h = 0; h < this.hiddenSize; h++) {
        sum += hidden[h] * this.weightsHO[offset + h];
      }
      // Tanh activation for muscle contraction [-1 to 1]
      outputs[o] = Math.tanh(sum);
    }

    if (captureState) {
      const wIH: number[][] = [];
      for (let h = 0; h < this.hiddenSize; h++) {
        const row: number[] = [];
        for (let i = 0; i < this.inputSize; i++) {
          row.push(this.weightsIH[h * this.inputSize + i]);
        }
        wIH.push(row);
      }

      const wHO: number[][] = [];
      for (let o = 0; o < this.outputSize; o++) {
        const row: number[] = [];
        for (let h = 0; h < this.hiddenSize; h++) {
          row.push(this.weightsHO[o * this.hiddenSize + h]);
        }
        wHO.push(row);
      }

      this.lastState = {
        inputs: Array.from(inputs),
        hidden: Array.from(hidden),
        outputs: [...outputs],
        weightsIH: wIH,
        weightsHO: wHO,
      };
    }

    return outputs;
  }

  clone(): NeuralNetwork {
    const copy = new NeuralNetwork(this.inputSize, this.hiddenSize, this.outputSize);
    copy.weightsIH.set(this.weightsIH);
    copy.biasH.set(this.biasH);
    copy.weightsHO.set(this.weightsHO);
    copy.biasO.set(this.biasO);
    return copy;
  }

  mutate(rate: number, amount: number): void {
    const mutateArr = (arr: Float32Array) => {
      for (let i = 0; i < arr.length; i++) {
        if (Math.random() < rate) {
          // Box-Muller normal distribution or uniform jitter
          const u1 = Math.random() || 0.0001;
          const u2 = Math.random();
          const gaussian = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
          arr[i] += gaussian * amount;
          // Clamp weights to prevent runaway explosion
          if (arr[i] > 5) arr[i] = 5;
          if (arr[i] < -5) arr[i] = -5;
        }
      }
    };

    mutateArr(this.weightsIH);
    mutateArr(this.biasH);
    mutateArr(this.weightsHO);
    mutateArr(this.biasO);
  }

  crossover(partner: NeuralNetwork): NeuralNetwork {
    const child = new NeuralNetwork(this.inputSize, this.hiddenSize, this.outputSize);

    const crossArr = (childArr: Float32Array, p1: Float32Array, p2: Float32Array) => {
      // Uniform or blend crossover
      for (let i = 0; i < childArr.length; i++) {
        const alpha = Math.random() < 0.5 ? 1 : 0;
        childArr[i] = alpha * p1[i] + (1 - alpha) * p2[i];
      }
    };

    crossArr(child.weightsIH, this.weightsIH, partner.weightsIH);
    crossArr(child.biasH, this.biasH, partner.biasH);
    crossArr(child.weightsHO, this.weightsHO, partner.weightsHO);
    crossArr(child.biasO, this.biasO, partner.biasO);

    return child;
  }

  serialize(): number[] {
    const totalLen = this.weightsIH.length + this.biasH.length + this.weightsHO.length + this.biasO.length;
    const result = new Array(totalLen);
    let idx = 0;
    for (let i = 0; i < this.weightsIH.length; i++) result[idx++] = this.weightsIH[i];
    for (let i = 0; i < this.biasH.length; i++) result[idx++] = this.biasH[i];
    for (let i = 0; i < this.weightsHO.length; i++) result[idx++] = this.weightsHO[i];
    for (let i = 0; i < this.biasO.length; i++) result[idx++] = this.biasO[i];
    return result;
  }

  deserialize(data: number[]): void {
    let idx = 0;
    for (let i = 0; i < this.weightsIH.length; i++) this.weightsIH[i] = data[idx++];
    for (let i = 0; i < this.biasH.length; i++) this.biasH[i] = data[idx++];
    for (let i = 0; i < this.weightsHO.length; i++) this.weightsHO[i] = data[idx++];
    for (let i = 0; i < this.biasO.length; i++) this.biasO[i] = data[idx++];
  }
}
