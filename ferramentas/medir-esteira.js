// Mede a esteira num Chrome de verdade, por CDP.
//
// O painel do navegador desta sessao fica escondido, e pagina escondida nao
// recebe `requestAnimationFrame` nem evento de `scroll`. Toda medida de
// movimento feita la da zero, e o zero e do painel, nao do site. Aqui o Chrome
// sobe com porta de depuracao, a pagina fica visivel pra ele, e o rAF roda.
//
//   node medir-esteira.js http://localhost:3055/?chave=...

const { spawn } = require('child_process');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORTA = 9333;
const URL = process.argv[2];
const PERFIL = __dirname + '/perfil-cdp';

if (!URL) { console.error('falta a URL'); process.exit(2); }

function esperar(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function alvo() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + PORTA + '/json/list');
      const abas = (await r.json()).filter((a) => a.type === 'page' && a.webSocketDebuggerUrl);
      if (abas.length) return abas[0];
    } catch (e) { /* ainda subindo */ }
    await esperar(400);
  }
  throw new Error('o Chrome nao abriu a porta de depuracao');
}

async function principal() {
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--remote-debugging-port=' + PORTA,
    '--user-data-dir=' + PERFIL,
    '--window-size=1440,900',
    URL,
  ], { stdio: 'ignore' });

  const aba = await alvo();
  const ws = new WebSocket(aba.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  let id = 0;
  const pendentes = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pendentes.has(m.id)) { pendentes.get(m.id)(m); pendentes.delete(m.id); }
  };
  function manda(metodo, params) {
    const meu = ++id;
    ws.send(JSON.stringify({ id: meu, method: metodo, params: params || {} }));
    return new Promise((r) => pendentes.set(meu, r));
  }
  async function js(codigo) {
    const r = await manda('Runtime.evaluate', {
      expression: codigo, awaitPromise: true, returnByValue: true,
    });
    if (r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.text);
    return r.result && r.result.result && r.result.result.value;
  }

  await manda('Page.enable');
  await esperar(3500);   // deixa o motor montar a esteira

  const pronto = await js(`(() => {
    const c = document.querySelector('.esteira');
    if (!c) return { erro: 'sem esteira' };
    c.scrollIntoView({ block: 'center' });
    return { itens: c.querySelector('.esteira__trilho').children.length };
  })()`);
  console.log('montagem:', JSON.stringify(pronto));

  await esperar(1200);   // o observador precisa de um quadro pra ver a esteira

  const medida = await js(`(async () => {
    const c = document.querySelector('.esteira');
    let quadros = 0;
    const conta = () => { quadros++; requestAnimationFrame(conta); };
    requestAnimationFrame(conta);
    const a = [];
    for (let i = 0; i < 5; i++) {
      a.push(Math.round(c.scrollLeft));
      await new Promise(r => setTimeout(r, 600));
    }
    return {
      dpr: devicePixelRatio,
      quadrosEm3s: quadros,
      amostras: a,
      andouEm2400ms: a[a.length - 1] - a[0],
    };
  })()`);

  console.log('medida:  ', JSON.stringify(medida));
  const v = medida.andouEm2400ms / 2.4;
  console.log('');
  console.log(medida.andouEm2400ms > 0
    ? 'ANDOU: ' + v.toFixed(1) + ' px/s'
    : 'PARADA');

  ws.close();
  chrome.kill();
  process.exit(medida.andouEm2400ms > 0 ? 0 : 1);
}

principal().catch((e) => { console.error('erro:', e.message); process.exit(1); });
