
const state = {
  current:      '0',   // number being typed
  previous:     null,  // number before operator
  operator:     null,  // pending operator (+, -, *, /)
  justEvaled:   false, // did we just press = ?
  hasDecimal:   false, // decimal point already placed?
};


const resultEl    = document.getElementById('result');
const expressionEl = document.getElementById('expression');
const statusEl    = document.getElementById('status');
const calcEl      = document.getElementById('calculator');


function formatNumber(num) {
  if (isNaN(num) || !isFinite(num)) return num.toString();
  // Limit to 12 significant digits to avoid float noise
  const str = parseFloat(num.toPrecision(12)).toString();
  // Add thousands separators on the integer part only
  const [intPart, decPart] = str.split('.');
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart !== undefined ? `${intFormatted}.${decPart}` : intFormatted;
}

function adjustFontSize(text) {
  resultEl.classList.remove('shrink', 'shrink-2');
  if (text.length > 14) resultEl.classList.add('shrink-2');
  else if (text.length > 9) resultEl.classList.add('shrink');
}

function updateDisplay(value) {
  resultEl.textContent = value;
  adjustFontSize(value);
}

function updateExpression(text) {
  expressionEl.textContent = text || '\u00a0'; // non-breaking space to preserve height
}

let statusTimer = null;
function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className   = 'display-status' + (isError ? ' error' : '');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusEl.textContent = '\u00a0';
    statusEl.className   = 'display-status';
  }, 1800);
}


 
function calculate(a, b, op) {
  const numA = parseFloat(a);
  const numB = parseFloat(b);

  if (isNaN(numA) || isNaN(numB)) return { value: null, error: 'Invalid input' };

  let result;
  switch (op) {
    case '+': result = numA + numB; break;
    case '-': result = numA - numB; break;
    case '*': result = numA * numB; break;
    case '/':
      if (numB === 0) return { value: null, error: 'Division by zero' };
      result = numA / numB;
      break;
    default:
      return { value: null, error: 'Unknown operator' };
  }

  if (!isFinite(result)) return { value: null, error: 'Overflow' };
  return { value: result, error: null };
}

// ─── Action Handlers ─────────────────────────────────────────────────────────

function handleDigit(digit) {
  if (state.justEvaled) {
    // After = pressed, start fresh number
    state.current    = digit;
    state.justEvaled = false;
    state.hasDecimal = false;
  } else if (state.current === '0' && digit !== '.') {
    state.current = digit;
  } else {
    if (state.current.replace('-', '').length >= 14) return; // length cap
    state.current += digit;
  }
  updateDisplay(state.current);
}

function handleDecimal() {
  if (state.justEvaled) {
    state.current    = '0.';
    state.justEvaled = false;
    state.hasDecimal = true;
    updateDisplay(state.current);
    return;
  }
  if (state.hasDecimal) return;
  state.current    += '.';
  state.hasDecimal  = true;
  updateDisplay(state.current);
}

function handleOperator(op) {
  // If there's a pending operation, evaluate it first (chaining)
  if (state.operator !== null && !state.justEvaled) {
    const { value, error } = calculate(state.previous, state.current, state.operator);
    if (error) {
      handleError(error);
      return;
    }
    state.previous = value.toString();
    updateDisplay(formatNumber(value));
  } else {
    state.previous = state.current;
  }

  state.operator    = op;
  state.justEvaled  = false;
  state.hasDecimal  = false;

  // Mark active operator button
  document.querySelectorAll('.btn-op').forEach(b => b.classList.remove('active-op'));
  document.querySelector(`[data-value="${CSS.escape(op)}"]`)?.classList.add('active-op');

  const opSymbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  updateExpression(`${formatNumber(parseFloat(state.previous))} ${opSymbols[op]}`);

  // next digit will replace current
  state.current = state.previous;
  state.justEvaled = true; // reuse flag to signal "next digit resets"
}

function handleEquals() {
  if (state.operator === null || state.previous === null) return;

  const expr = `${formatNumber(parseFloat(state.previous))} ${
    { '+': '+', '-': '−', '*': '×', '/': '÷' }[state.operator]
  } ${formatNumber(parseFloat(state.current))} =`;

  const { value, error } = calculate(state.previous, state.current, state.operator);

  if (error) {
    handleError(error);
    return;
  }

  updateExpression(expr);
  updateDisplay(formatNumber(value));

  state.current    = value.toString();
  state.previous   = null;
  state.operator   = null;
  state.justEvaled = true;
  state.hasDecimal = value.toString().includes('.');

  document.querySelectorAll('.btn-op').forEach(b => b.classList.remove('active-op'));
}

function handleClear() {
  state.current    = '0';
  state.previous   = null;
  state.operator   = null;
  state.justEvaled = false;
  state.hasDecimal = false;
  updateDisplay('0');
  updateExpression('');
  document.querySelectorAll('.btn-op').forEach(b => b.classList.remove('active-op'));
}

function handleSign() {
  if (state.current === '0') return;
  state.current = state.current.startsWith('-')
    ? state.current.slice(1)
    : '-' + state.current;
  updateDisplay(state.current);
}

function handlePercent() {
  const val = parseFloat(state.current) / 100;
  state.current    = val.toString();
  state.hasDecimal = state.current.includes('.');
  updateDisplay(formatNumber(val));
}

function handleError(msg) {
  showStatus(msg, true);
  calcEl.classList.remove('shake');
  void calcEl.offsetWidth; // reflow to restart animation
  calcEl.classList.add('shake');
  calcEl.addEventListener('animationend', () => calcEl.classList.remove('shake'), { once: true });
  handleClear();
}



function flashButton(btn) {
  btn.classList.remove('flash');
  void btn.offsetWidth;
  btn.classList.add('flash');
  btn.addEventListener('animationend', () => btn.classList.remove('flash'), { once: true });
}

// ─── Event Delegation on Button Grid ─────────────────────────────────────────

document.querySelector('.btn-grid').addEventListener('click', (e) => {
  const btn = e.target.closest('.btn');
  if (!btn) return;

  flashButton(btn);

  const action = btn.dataset.action;
  const value  = btn.dataset.value;

  switch (action) {
    case 'digit':    handleDigit(value);    break;
    case 'decimal':  handleDecimal();       break;
    case 'operator': handleOperator(value); break;
    case 'equals':   handleEquals();        break;
    case 'clear':    handleClear();         break;
    case 'sign':     handleSign();          break;
    case 'percent':  handlePercent();       break;
  }
});

// ─── Keyboard Support ─────────────────────────────────────────────────────────

const KEY_MAP = {
  '0': () => handleDigit('0'),
  '1': () => handleDigit('1'),
  '2': () => handleDigit('2'),
  '3': () => handleDigit('3'),
  '4': () => handleDigit('4'),
  '5': () => handleDigit('5'),
  '6': () => handleDigit('6'),
  '7': () => handleDigit('7'),
  '8': () => handleDigit('8'),
  '9': () => handleDigit('9'),
  '.': () => handleDecimal(),
  ',': () => handleDecimal(),
  '+': () => handleOperator('+'),
  '-': () => handleOperator('-'),
  '*': () => handleOperator('*'),
  'x': () => handleOperator('*'),
  'X': () => handleOperator('*'),
  '/': () => handleOperator('/'),
  'Enter':     () => handleEquals(),
  '=':         () => handleEquals(),
  'Backspace': () => {
    if (state.justEvaled || state.current.length <= 1) {
      state.current    = '0';
      state.hasDecimal = false;
    } else {
      const removed     = state.current.slice(-1);
      state.current     = state.current.slice(0, -1) || '0';
      if (removed === '.') state.hasDecimal = false;
    }
    updateDisplay(state.current);
  },
  'Escape': () => handleClear(),
  'Delete': () => handleClear(),
  'p': () => handlePercent(),
  '%': () => handlePercent(),
};

document.addEventListener('keydown', (e) => {
  const handler = KEY_MAP[e.key];
  if (!handler) return;
  e.preventDefault();
  handler();

  // Visually highlight the matching button
  const keyButtonMap = {
    '0':'[data-value="0"]','1':'[data-value="1"]','2':'[data-value="2"]',
    '3':'[data-value="3"]','4':'[data-value="4"]','5':'[data-value="5"]',
    '6':'[data-value="6"]','7':'[data-value="7"]','8':'[data-value="8"]',
    '9':'[data-value="9"]','+':'[data-value="+"]','-':'[data-value="-"]',
    '*':'[data-value="*"]','/':'[data-value="/"]','Enter':'[data-action="equals"]',
    '=':'[data-action="equals"]','Escape':'[data-action="clear"]',
    'Delete':'[data-action="clear"]','.':'[data-action="decimal"]',
    'Backspace': null, // no button equivalent
  };
  const sel = keyButtonMap[e.key];
  if (sel) {
    const btn = calcEl.querySelector(sel);
    if (btn) flashButton(btn);
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────
updateDisplay('0');
updateExpression('');