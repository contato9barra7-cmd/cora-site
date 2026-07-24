'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registrar } from '../../lib/auth';
import CampoSenha, { senhaForte } from '../../components/CampoSenha';
import { useIdioma } from '../../lib/i18n';
import LoginSplit from '../../components/LoginSplit';
import DropdownCora from '../../components/DropdownCora';

export default function Cadastro() {
  const router = useRouter();
  const { t } = useIdioma();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [genero, setGenero] = useState('');
  const [profissao, setProfissao] = useState('');
  const [origem, setOrigem] = useState('');
  const [usaRender, setUsaRender] = useState('');
  const [tamanho, setTamanho] = useState('');
  const [volume, setVolume] = useState('');
  const [senhaValida, setSenhaValida] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const [faltando, setFaltando] = useState({});
  // Cadastro em 2 passos: o passo 1 e o que cria a conta (nome, email, senha).
  // O passo 2 e a pesquisa — importante para nos, irrelevante para quem so
  // quer testar. Separar evita pedir 9 campos antes de a pessoa ver o produto.
  const [passo, setPasso] = useState(1);
  // Se veio de um convite, trava o email (a conta tem que ser desse email).
  const [emailTravado, setEmailTravado] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const em = localStorage.getItem('cora_convite_email');
      if (em) { setEmail(em); setEmailTravado(true); }
    }
  }, []);

  // Passo 1 -> 2: valida so o que cria a conta.
  function irParaPasso2() {
    setErro('');
    const falta = {};
    if (!nome.trim()) falta.nome = true;
    if (!email) falta.email = true;
    if (!senhaValida) falta.senha = true;
    if (!aceite) falta.aceite = true;

    if (Object.keys(falta).length) {
      setFaltando(falta);
      if (falta.aceite && Object.keys(falta).length === 1) setErro(t('cad_aceite_erro'));
      else if (!senhaValida) setErro(!senhaForte(senha) ? t('nova_req') : t('nova_confirme'));
      else setErro(t('cad_preencha'));
      return;
    }
    setFaltando({});
    setPasso(2);
  }

  async function criarConta() {
    setErro('');
    const falta = {};
    if (!nome.trim()) falta.nome = true;
    if (!email) falta.email = true;
    if (!genero) falta.genero = true;
    if (!profissao) falta.profissao = true;
    if (!origem) falta.origem = true;
    if (!usaRender) falta.usaRender = true;
    if (!tamanho) falta.tamanho = true;
    if (!volume) falta.volume = true;
    if (!senhaValida) falta.senha = true;
    if (!aceite) falta.aceite = true;

    if (Object.keys(falta).length) {
      setFaltando(falta);
      let msg;
      if (falta.aceite && Object.keys(falta).length === 1) {
        msg = t('cad_aceite_erro');
      } else if (!senhaValida) {
        msg = !senhaForte(senha)
          ? t('nova_req')
          : t('nova_confirme');
      } else {
        msg = t('cad_preencha');
      }
      setErro(msg);
      return;
    }
    setFaltando({});
    setCarregando(true);
    try {
      await registrar({ email, senha, nome, genero, profissao, origem, usa_render: usaRender, tamanho, volume });
      router.push('/verificar?email=' + encodeURIComponent(email));
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  const cls = (campo) => 'login-input' + (faltando[campo] ? ' campo-erro' : '');

  return (
    <LoginSplit>
      <div className="login-card">
        <Link href="/" className="login-logo">Cora Render</Link>
        <p className="cad-passo-tag">{t('cad_passo').replace('{n}', String(passo))}</p>
        <h1 className="login-titulo">{passo === 1 ? t('cad_criar') : t('cad_sobre_voce')}</h1>
        <p className="login-sub">{passo === 1 ? t('cad_sub') : t('cad_sobre_voce_sub')}</p>

        {passo === 1 && (<>

        <label className="login-label">{t('cad_nome_completo')} <span className="obrig">*</span></label>
        <input
          className={cls('nome')} type="text" placeholder={t('cad_ph_nome_completo')}
          value={nome} onChange={(e) => setNome(e.target.value)}
        />

        <label className="login-label">{t('login_email')} <span className="obrig">*</span></label>
        <input
          className={cls('email')} type="email" placeholder={t('login_ph_email')}
          value={email} onChange={(e) => setEmail(e.target.value)}
          readOnly={emailTravado} title={emailTravado ? t('login_email_travado') : undefined}
        />

        <CampoSenha senha={senha} setSenha={setSenha} onValidez={setSenhaValida} erroCampo={faltando.senha} />

        {erro && <p className="login-erro">{erro}</p>}

        <label className={'cad-aceite' + (faltando.aceite ? ' cad-aceite--erro' : '')}>
          <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
          <span>
            {t('cad_li1')} <Link href="/termos" target="_blank">{t('cad_termos')}</Link> {t('cad_li_e')}{' '}
            <Link href="/privacidade" target="_blank">{t('cad_privacidade')}</Link>.
          </span>
        </label>

        <button className="btn btn--verde" style={{ marginTop: 14 }} onClick={irParaPasso2}>
          {t('cad_continuar')}
        </button>

        <p className="login-rodape">
          {t('cad_ja_tem')} <Link href="/login">{t('login_entrar')}</Link>
        </p>
        </>)}

        {passo === 2 && (<>
        <label className="login-label">{t('cad_genero')} <span className="obrig">*</span></label>
        <div className={faltando.genero ? 'cad-dd cad-dd--erro' : 'cad-dd'}>
          <DropdownCora
            valor={genero}
            onEscolher={setGenero}
            opcoes={[
              { v: '', n: t('cad_selecione') },
              { v: 'feminino', n: t('cad_g_fem') },
              { v: 'masculino', n: t('cad_g_masc') },
              { v: 'nao_binario', n: t('cad_g_nb') },
              { v: 'nao_informar', n: t('cad_g_ni') }
            ]}
          />
        </div>

        <label className="login-label">{t('cad_profissao')} <span className="obrig">*</span></label>
        <div className={faltando.profissao ? 'cad-dd cad-dd--erro' : 'cad-dd'}>
          <DropdownCora
            valor={profissao}
            onEscolher={setProfissao}
            opcoes={[
              { v: '', n: t('cad_selecione') },
              { v: 'arquiteto', n: t('cad_p_arq') },
              { v: 'designer_interiores', n: t('cad_p_design') },
              { v: 'archviz', n: 'Archviz' },
              { v: 'engenheiro', n: t('cad_p_eng') },
              { v: 'estudante', n: t('cad_p_estud') },
              { v: 'paisagista', n: t('cad_p_pais') },
              { v: 'outro', n: t('cad_outro') }
            ]}
          />
        </div>

        <label className="login-label">{t('cad_origem')} <span className="obrig">*</span></label>
        <div className={faltando.origem ? 'cad-dd cad-dd--erro' : 'cad-dd'}>
          <DropdownCora
            valor={origem}
            onEscolher={setOrigem}
            opcoes={[
              { v: '', n: t('cad_selecione') },
              { v: 'instagram', n: 'Instagram' },
              { v: 'youtube', n: 'YouTube' },
              { v: 'google', n: t('cad_o_google') },
              { v: 'indicacao', n: t('cad_o_indicacao') },
              { v: 'tiktok', n: 'TikTok' },
              { v: 'anuncio', n: t('cad_o_anuncio') },
              { v: 'outro', n: t('cad_outro') }
            ]}
          />
        </div>

        <label className="login-label">{t('cad_usa')} <span className="obrig">*</span></label>
        <div className={faltando.usaRender ? 'cad-dd cad-dd--erro' : 'cad-dd'}>
          <DropdownCora
            valor={usaRender}
            onEscolher={setUsaRender}
            opcoes={[
              { v: '', n: t('cad_selecione') },
              { v: 'nao', n: t('cad_u_nenhum') },
              { v: 'vray', n: 'V-Ray' },
              { v: 'corona', n: 'Corona' },
              { v: 'enscape', n: 'Enscape' },
              { v: 'lumion', n: 'Lumion' },
              { v: 'dhistudio', n: t('cad_u_d5') },
              { v: 'outro', n: t('cad_outro') }
            ]}
          />
        </div>

        <label className="login-label">{t('cad_tamanho')} <span className="obrig">*</span></label>
        <div className={faltando.tamanho ? 'cad-dd cad-dd--erro' : 'cad-dd'}>
          <DropdownCora
            valor={tamanho}
            onEscolher={setTamanho}
            opcoes={[
              { v: '', n: t('cad_selecione') },
              { v: 'autonomo', n: t('cad_t_auto') },
              { v: '2a5', n: t('cad_t_2a5') },
              { v: '6a20', n: t('cad_t_6a20') },
              { v: '20mais', n: t('cad_t_20') }
            ]}
          />
        </div>

        <label className="login-label">{t('cad_volume')} <span className="obrig">*</span></label>
        <div className={faltando.volume ? 'cad-dd cad-dd--erro' : 'cad-dd'}>
          <DropdownCora
            valor={volume}
            onEscolher={setVolume}
            opcoes={[
              { v: '', n: t('cad_selecione') },
              { v: 'menos10', n: t('cad_v_menos10') },
              { v: '10a20', n: t('cad_v_10a20') },
              { v: 'mais20', n: t('cad_v_mais20') }
            ]}
          />
        </div>

        {erro && <p className="login-erro">{erro}</p>}

        <button className="btn btn--verde" style={{ marginTop: 28 }} onClick={criarConta} disabled={carregando}>
          {carregando ? t('cad_criando') : t('login_criar_conta')}
        </button>

        <button type="button" className="cad-voltar" onClick={() => { setErro(''); setPasso(1); }}>
          {t('cad_voltar')}
        </button>
        </>)}
      </div>
    </LoginSplit>
  );
}
