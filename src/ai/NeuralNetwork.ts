export interface DeepBrainActivationState {
  inputs: number[];
  hidden1: number[];
  hidden2: number[];
  outputs: number[];
  weightsIH1: number[][]; // [hidden1][input]
  weightsH1H2: number[][]; // [hidden2][hidden1]
  weightsH2O: number[][];  // [output][hidden2]
}

export class NeuralNetwork {
  inputSize: number;
  hidden1Size: number;
  hidden2Size: number;
  outputSize: number;

  weightsIH1: Float32Array;  // input to hidden1
  biasH1: Float32Array;      // hidden1 bias
  weightsH1H2: Float32Array; // hidden1 to hidden2
  biasH2: Float32Array;      // hidden2 bias
  weightsH2O: Float32Array;  // hidden2 to output
  biasO: Float32Array;       // output bias

  // Recurrent short-term memory (previous frame motor activations)
  prevOutputs: number[];

  // Cache for visualizer
  lastState: DeepBrainActivationState | null = null;

  constructor(inputSize: number, hidden1Size: number, hidden2Size: number, outputSize: number) {
    this.inputSize = inputSize;
    this.hidden1Size = hidden1Size;
    this.hidden2Size = hidden2Size;
    this.outputSize = outputSize;

    this.weightsIH1 = new Float32Array(hidden1Size * inputSize);
    this.biasH1 = new Float32Array(hidden1Size);
    this.weightsH1H2 = new Float32Array(hidden2Size * hidden1Size);
    this.biasH2 = new Float32Array(hidden2Size);
    this.weightsH2O = new Float32Array(outputSize * hidden2Size);
    this.biasO = new Float32Array(outputSize);

    this.prevOutputs = new Array(outputSize).fill(0);
    this.randomize();
  }

  randomize(): void {
    // He / Kaiming initialization for LeakyReLU layer 1
    const scaleIH1 = Math.sqrt(2.0 / this.inputSize);
    for (let i = 0; i < this.weightsIH1.length; i++) {
      this.weightsIH1[i] = (Math.random() * 2 - 1) * scaleIH1;
    }
    for (let i = 0; i < this.biasH1.length; i++) {
      this.biasH1[i] = (Math.random() * 2 - 1) * 0.05;
    }

    // Xavier initialization for Tanh layer 2
    const scaleH1H2 = Math.sqrt(2.0 / (this.hidden1Size + this.hidden2Size));
    for (let i = 0; i < this.weightsH1H2.length; i++) {
      this.weightsH1H2[i] = (Math.random() * 2 - 1) * scaleH1H2;
    }
    for (let i = 0; i < this.biasH2.length; i++) {
      this.biasH2[i] = (Math.random() * 2 - 1) * 0.05;
    }

    // Output layer
    const scaleH2O = Math.sqrt(2.0 / (this.hidden2Size + this.outputSize));
    for (let i = 0; i < this.weightsH2O.length; i++) {
      this.weightsH2O[i] = (Math.random() * 2 - 1) * scaleH2O;
    }
    for (let i = 0; i < this.biasO.length; i++) {
      this.biasO[i] = (Math.random() * 2 - 1) * 0.05;
    }
  }

  forward(rawInputs: number[], captureState = false): number[] {
    // Concatenate recurrent memory (previous frame motor activations)
    const inputs = [...rawInputs, ...this.prevOutputs];

    // Layer 1: Input -> Hidden 1 (LeakyReLU activation)
    const hidden1 = new Float32Array(this.hidden1Size);
    for (let h = 0; h < this.hidden1Size; h++) {
      let sum = this.biasH1[h];
      const offset = h * this.inputSize;
      for (let i = 0; i < this.inputSize; i++) {
        sum += (inputs[i] || 0) * this.weightsIH1[offset + i];
      }
      // LeakyReLU: max(0.08 * sum, sum)
      hidden1[h] = sum > 0 ? sum : sum * 0.08;
    }

    // Layer 2: Hidden 1 -> Hidden 2 (Tanh activation)
    const hidden2 = new Float32Array(this.hidden2Size);
    for (let h2 = 0; h2 < this.hidden2Size; h2++) {
      let sum = this.biasH2[h2];
      const offset = h2 * this.hidden1Size;
      for (let h1 = 0; h1 < this.hidden1Size; h1++) {
        sum += hidden1[h1] * this.weightsH1H2[offset + h1];
      }
      hidden2[h2] = Math.tanh(sum);
    }

    // Output Layer: Hidden 2 -> Outputs (Tanh activation for muscle actuation [-1, 1])
    const outputs = new Array(this.outputSize);
    for (let o = 0; o < this.outputSize; o++) {
      let sum = this.biasO[o];
      const offset = o * this.hidden2Size;
      for (let h2 = 0; h2 < this.hidden2Size; h2++) {
        sum += hidden2[h2] * this.weightsH2O[offset + h2];
      }
      outputs[o] = Math.tanh(sum);
    }

    // Store recurrent memory for next tick
    this.prevOutputs = [...outputs];

    if (captureState) {
      const wIH1: number[][] = [];
      for (let h = 0; h < this.hidden1Size; h++) {
        const row: number[] = [];
        for (let i = 0; i < this.inputSize; i++) {
          row.push(this.weightsIH1[h * this.inputSize + i]);
        }
        wIH1.push(row);
      }

      const wH1H2: number[][] = [];
      for (let h2 = 0; h2 < this.hidden2Size; h2++) {
        const row: number[] = [];
        for (let h1 = 0; h1 < this.hidden1Size; h1++) {
          row.push(this.weightsH1H2[h2 * this.hidden1Size + h1]);
        }
        wH1H2.push(row);
      }

      const wH2O: number[][] = [];
      for (let o = 0; o < this.outputSize; o++) {
        const row: number[] = [];
        for (let h2 = 0; h2 < this.hidden2Size; h2++) {
          row.push(this.weightsH2O[o * this.hidden2Size + h2]);
        }
        wH2O.push(row);
      }

      this.lastState = {
        inputs: Array.from(inputs),
        hidden1: Array.from(hidden1),
        hidden2: Array.from(hidden2),
        outputs: [...outputs],
        weightsIH1: wIH1,
        weightsH1H2: wH1H2,
        weightsH2O: wH2O,
      };
    }

    return outputs;
  }

  clone(): NeuralNetwork {
    const copy = new NeuralNetwork(this.inputSize, this.hidden1Size, this.hidden2Size, this.outputSize);
    copy.weightsIH1.set(this.weightsIH1);
    copy.biasH1.set(this.biasH1);
    copy.weightsH1H2.set(this.weightsH1H2);
    copy.biasH2.set(this.biasH2);
    copy.weightsH2O.set(this.weightsH2O);
    copy.biasO.set(this.biasO);
    return copy;
  }

  mutate(rate: number, amount: number): void {
    const mutateArr = (arr: Float32Array) => {
      for (let i = 0; i < arr.length; i++) {
        if (Math.random() < rate) {
          const u1 = Math.random() || 0.0001;
          const u2 = Math.random();
          const gaussian = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
          arr[i] += gaussian * amount;
          if (arr[i] > 6.0) arr[i] = 6.0;
          if (arr[i] < -6.0) arr[i] = -6.0;
        }
      }
    };

    mutateArr(this.weightsIH1);
    mutateArr(this.biasH1);
    mutateArr(this.weightsH1H2);
    mutateArr(this.biasH2);
    mutateArr(this.weightsH2O);
    mutateArr(this.biasO);
  }

  crossover(partner: NeuralNetwork): NeuralNetwork {
    const child = new NeuralNetwork(this.inputSize, this.hidden1Size, this.hidden2Size, this.outputSize);

    const crossArr = (childArr: Float32Array, p1: Float32Array, p2: Float32Array) => {
      for (let i = 0; i < childArr.length; i++) {
        const alpha = Math.random() < 0.5 ? 1 : 0;
        childArr[i] = alpha * p1[i] + (1 - alpha) * p2[i];
      }
    };

    crossArr(child.weightsIH1, this.weightsIH1, partner.weightsIH1);
    crossArr(child.biasH1, this.biasH1, partner.biasH1);
    crossArr(child.weightsH1H2, this.weightsH1H2, partner.weightsH1H2);
    crossArr(child.biasH2, this.biasH2, partner.biasH2);
    crossArr(child.weightsH2O, this.weightsH2O, partner.weightsH2O);
    crossArr(child.biasO, this.biasO, partner.biasO);

    return child;
  }
}
