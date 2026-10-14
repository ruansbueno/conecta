"""Telas da plataforma web de gestão (administração, coordenação e docentes)."""
from shell import web, page, topbar, ic, logo, mark, NAV_DOC, sidebar

DOC = ("Ricardo Lemos", "Docente", "RL")
ADM = ("Paulo Ferraz", "Administrador", "PF")


def com_modal(tela, modal):
    """Insere uma camada sobreposta na tela já montada, sem duplicar a moldura."""
    return tela.replace("</body>", modal + "</body>")


def chip(texto, tipo="turma", x=False):
    fechar = '<span class="x">✕</span>' if x else ""
    return f'<span class="chip t-{tipo}"><span class="dot"></span>{texto}{fechar}</span>'


def busca(ph="Buscar", w=280):
    return (f'<div class="input" style="height:36px;width:{w}px;border-radius:9px;font-size:13px">'
            f'{ic("busca",16,"#8A99B0")}<span style="color:#8A99B0">{ph}</span></div>')


def card(titulo, corpo, acao=None, pad=20):
    cab = f"""<div class="row between center" style="padding:16px 20px;border-bottom:1px solid #EFF2F7">
<span class="h3" style="font-size:14.5px">{titulo}</span>{acao or ''}</div>""" if titulo else ""
    return f'<div class="card">{cab}<div style="padding:{pad}px">{corpo}</div></div>'


# ---------------------------------------------------------------- 01 login
def login():
    esq = f"""<div style="width:620px;flex:0 0 620px;background:#132A4E;padding:56px 56px 48px;
display:flex;flex-direction:column;color:#fff">
{logo('lg','#FFFFFF')}
<div class="grow"></div>
<div style="font-size:34px;font-weight:700;letter-spacing:-.03em;line-height:1.2;max-width:420px">
Um só lugar para avisar a turma certa.</div>
<div style="font-size:15px;line-height:1.6;color:#B9C6DE;max-width:420px;margin-top:18px">
Publique avisos e eventos para todos, para semestres inteiros, para os docentes ou para turmas
específicas — e acompanhe o que foi publicado, editado e arquivado.</div>
<div class="grow"></div>
<div style="font-size:12.5px;color:#7F91B2">IFSul · Tecnologia em Sistemas para Internet</div></div>"""
    dir_ = f"""<div class="grow" style="background:#fff;display:flex;align-items:center;
justify-content:center">
<div style="width:380px">
<div class="h1" style="font-size:28px">Acesso à gestão</div>
<div class="sub mt8">Disponível para administração, coordenação e docentes. Alunos usam o
aplicativo.</div>
<label class="field mt32"><span class="lbl">Usuário</span>
<div class="input ph">{ic('perfil',18,'#8A99B0')} seu.usuario</div></label>
<label class="field mt16"><span class="lbl">Senha</span>
<div class="input focus">{ic('cadeado',18,'#2563EB')}
<span style="letter-spacing:.22em">••••••••••</span></div></label>
<div class="btn btn-primary btn-block mt24">Entrar</div>
<div class="row gap8 mt24" style="padding:14px 16px;background:#F5F8FC;border-radius:10px">
{ic('escudo',17,'#2A4374')}<span class="meta" style="color:#2A4374;line-height:1.5">
Credenciais validadas pelo Moodle do IFSul. A sessão expira em 24 h.</span></div></div></div>"""
    return page(esq + dir_, "frame-web", 1440, 900)


# ---------------------------------------------------------------- 02 painel coordenação
def agenda_mini(dia, mes, titulo, info):
    return f"""<div class="row gap12" style="flex:1">
<div class="col center" style="width:44px;flex:0 0 44px">
<span style="font-size:18px;font-weight:700;color:#132A4E;letter-spacing:-.02em">{dia}</span>
<span class="meta" style="font-size:11px">{mes}</span></div>
<div class="col gap4" style="min-width:0">
<span style="font-size:13px;font-weight:600;color:#132A4E;line-height:1.3">{titulo}</span>
<span class="meta">{info}</span></div></div>"""


def painel():
    def num(valor, rotulo, nota, cor="#132A4E"):
        return f"""<div class="card" style="flex:1;padding:18px 20px">
<div style="font-size:30px;font-weight:700;letter-spacing:-.03em;color:{cor};line-height:1">{valor}</div>
<div class="h3 mt8" style="font-size:13.5px">{rotulo}</div>
<div class="meta mt4">{nota}</div></div>"""

    def aviso_linha(titulo, autor, destinos, quando, selo):
        return f"""<div class="row center gap16" style="padding:13px 0;border-bottom:1px solid #EFF2F7">
<div class="col gap6" style="width:420px">
<span style="font-size:13.5px;font-weight:600;color:#132A4E">{titulo}</span>
<span class="meta">{autor}</span></div>
<div class="chips grow">{destinos}</div>
<span class="meta" style="width:90px">{quando}</span>{selo}</div>"""

    def pedido(nome, turma, quando, ini):
        return f"""<div class="row center gap12" style="padding:12px 0;border-bottom:1px solid #EFF2F7">
<div class="avatar sm blue">{ini}</div>
<div class="col grow gap4" style="min-width:0"><span style="font-size:13px;font-weight:600;
color:#132A4E">{nome}</span><span class="meta" style="white-space:nowrap;overflow:hidden;
text-overflow:ellipsis;max-width:190px">{turma} · {quando}</span></div>
<div class="row gap6">
<div class="btn btn-sm btn-primary" style="height:30px;padding:0 11px">Aprovar</div>
<div class="btn btn-sm btn-ghost" style="height:30px;padding:0 11px">Recusar</div></div></div>"""

    corpo = f"""<div class="content">
<div class="row between center">
<div class="col"><div class="h1">Bom dia, Marina</div>
<div class="sub mt6">4 avisos ativos nesta semana e 7 solicitações esperando decisão.</div></div>
<div class="btn btn-primary">{ic('mais',18,'#fff')} Novo aviso</div></div>

<div class="row gap16 mt24">
{num("4","Avisos ativos","publicados nos últimos 7 dias")}
{num("1","Aviso agendado","vai ao ar em 16/10, 08:00","#B45309")}
{num("7","Solicitações pendentes","2 há mais de 3 dias","#B45309")}
{num("12","Turmas ativas","em 2026/2")}
</div>

<div class="row gap16 mt20" style="align-items:flex-start">
<div style="flex:1.55">{card("Publicados recentemente",
  aviso_linha("Matrícula do 2º semestre: prazos e orientações","Marina Duarte · hoje",
              chip("Todos","todos"),"há 2 h",'<span class="badge b-ativo">Ativo</span>') +
  aviso_linha("Defesas de TCC II — bancas de 24 de outubro","Marina Duarte · ontem",
              chip("6º semestre","semestre")+chip("Docentes","docentes"),"ontem",
              '<span class="badge b-ativo">Ativo</span>') +
  aviso_linha("Entrega do trabalho de Redes adiada","Ricardo Lemos · seg",
              chip("SI-3A"),"seg, 09:12",'<span class="badge b-blue">Editado</span>') +
  aviso_linha("Semana Acadêmica 2026/2: programação","Marina Duarte · agendado",
              chip("Todos","todos"),"16/10, 08:00",'<span class="badge b-pend">Agendado</span>') +
  aviso_linha("Sala alterada: Banco de Dados II no Lab 4","Helena Prado · seg",
              chip("SI-3A")+chip("SI-3B"),"seg, 08:40",'<span class="badge b-ativo">Ativo</span>'),
  '<span class="btn-quiet" style="font-size:13px">Ver todos</span>', pad=4)}</div>
<div style="flex:1">{card("Solicitações de inscrição",
  pedido("Júlia Santos","Introdução a Ciência de Dados","há 1 dia","JS") +
  pedido("Caio Ribeiro","Sistemas para Internet 4A","há 2 dias","CR") +
  pedido("Ana Beatriz Lopes","Desenvolvimento de Jogos","há 4 dias","AL") +
  pedido("Marcos Vinícius Reis","Sistemas para Internet 4A","há 5 dias","MR"),
  '<span class="badge b-pend">7 pendentes</span>', pad=4)}</div></div>

<div class="row gap16 mt16" style="align-items:flex-start">
<div style="flex:1.55">{card("Próximos na agenda",
  '<div class="row gap24">' + agenda_mini("16","out","Prova de Banco de Dados II",
  "19:10 · Lab 4 · SI-3A") + agenda_mini("21","out",
  "Palestra: carreira em nuvem","19:00 · Auditório · Todos") + agenda_mini("24","out",
  "Defesas de TCC II","14:00 · Sala 203 · 6º semestre") + '</div>',
  '<span class="btn-quiet" style="font-size:13px">Abrir agenda</span>')}</div>
<div style="flex:1">{card("Turmas com inscrições abertas",
  '<div class="row between center" style="padding-bottom:10px">'
  '<span class="sub">SI-3A · SI-3B · SI-4A · OPT-1 · OPT-2</span></div>'
  '<div class="sub" style="color:#5B6B86">7 das 12 turmas estão recebendo solicitações. '
  'Fechar as inscrições de uma turma não desfaz os vínculos já criados.</div>')}</div></div></div>"""
    return web(topbar("Painel", "Coordenação · Tecnologia em Sistemas para Internet",
                      ic('sino', 20, '#5B6B86')) + corpo, "Painel")


# ---------------------------------------------------------------- 03 avisos
def avisos_lista():
    def linha(titulo, autor, destinos, publicado, selo, versoes):
        return f"""<tr><td>
<div class="col gap4"><span class="strong">{titulo}</span>
<span class="meta">{versoes}</span></div></td>
<td>{autor}</td><td><div class="chips">{destinos}</div></td>
<td>{publicado}</td><td>{selo}</td>
<td><div class="row gap10">{ic('lapis',17,'#5B6B86')}{ic('arquivo',17,'#5B6B86')}
{ic('historico',17,'#5B6B86')}</div></td></tr>"""

    tabela = f"""<table class="tbl">
<thead><tr><th style="width:360px">Aviso</th><th style="width:150px">Autor</th>
<th>Destinos</th><th style="width:130px">Publicação</th><th style="width:110px">Situação</th>
<th style="width:90px">Ações</th></tr></thead><tbody>
{linha("Matrícula do 2º semestre: prazos e orientações","Marina Duarte",chip("Todos","todos"),
       "13/10, 08:30",'<span class="badge b-ativo">Ativo</span>',"versão 1")}
{linha("Defesas de TCC II — bancas de 24 de outubro","Marina Duarte",
       chip("6º semestre","semestre")+chip("Docentes","docentes"),"12/10, 17:02",
       '<span class="badge b-ativo">Ativo</span>',"versão 1")}
{linha("Entrega do trabalho de Redes adiada para 30/10","Ricardo Lemos",chip("SI-3A"),
       "07/10, 09:12",'<span class="badge b-ativo">Ativo</span>',"versão 2 · editado 07/10, 14:05")}
{linha("Sala alterada: Banco de Dados II agora no Lab 4","Helena Prado",
       chip("SI-3A")+chip("SI-3B"),"07/10, 08:40",'<span class="badge b-ativo">Ativo</span>',
       "versão 1")}
{linha("Semana Acadêmica 2026/2: programação completa","Marina Duarte",chip("Todos","todos"),
       "16/10, 08:00",'<span class="badge b-pend">Agendado</span>',"versão 1")}
{linha("Resultado da seleção de monitoria 2026/2","Marina Duarte",chip("Todos","todos"),
       "12/09, 10:00",'<span class="badge b-arq">Arquivado</span>',"versão 3")}
{linha("Prova de Estrutura de Dados remarcada","Helena Prado",chip("SI-3A"),"03/09, 19:20",
       '<span class="badge b-arq">Arquivado</span>',"versão 1")}
{linha("Aula cancelada em 28/08","Ricardo Lemos",chip("SI-3A"),"28/08, 07:10",
       '<span class="badge b-exc">Excluído</span>',"versão 1 · mantido para auditoria")}
</tbody></table>"""

    corpo = f"""<div class="content">
<div class="row between center">
<div class="col"><div class="h1">Avisos</div>
<div class="sub mt6">Tudo que foi publicado no curso, com o público de cada aviso.</div></div>
<div class="btn btn-primary">{ic('mais',18,'#fff')} Novo aviso</div></div>

<div class="row between center mt20">
<div class="tabs" style="border:none">
<span class="t on">Ativos</span><span class="t">Agendados</span><span class="t">Arquivados</span>
<span class="t">Excluídos</span></div>
<div class="row gap10">{busca("Buscar por título ou autor")}
<div class="row center gap8" style="height:36px;padding:0 13px;border:1px solid #E4E9F2;
border-radius:9px">{ic('filtro',16,'#5B6B86')}
<span style="font-size:13px;font-weight:550;color:#2A4374">Destino</span></div></div></div>

<div class="card mt16" style="padding:14px 0 0">{tabela}
<div class="row between center" style="padding:14px 20px;border-top:1px solid #EFF2F7">
<span class="meta">Mostrando 8 de 34 avisos</span>
<div class="row gap8"><span class="meta">Anterior</span>
<span style="font-size:12.5px;font-weight:600;color:#2563EB">Próxima</span></div></div></div></div>"""
    return web(topbar("Avisos", "Coordenação", ic('sino', 20, '#5B6B86')) + corpo, "Avisos")


# ---------------------------------------------------------------- 04 editor de aviso
def aviso_editor():
    destinos = (chip("Todos os usuários", "todos", True) + chip("SI-3A", "turma", True) +
                chip("SI-3B", "turma", True) + chip("6º semestre", "semestre", True) +
                chip("Docentes", "docentes", True))
    esq = f"""<div style="flex:1.6">
<label class="field"><span class="lbl">Título</span>
<div class="input">Semana Acadêmica 2026/2: programação completa</div></label>
<label class="field mt20"><span class="lbl">Conteúdo</span>
<div class="input area" style="height:286px;line-height:1.6;color:#263A5B">
A Semana Acadêmica acontece de 4 a 8 de novembro, no câmpus. A programação traz palestras,
oficinas de curta duração e a mostra de projetos dos alunos do curso.<br><br>
As inscrições nas oficinas abrem no dia 20 de outubro e são limitadas por sala. A presença vale
horas complementares mediante registro na entrada.<span style="color:#C3CCDA">|</span></div></label>
<div class="meta mt8">1 248 de 5 000 caracteres</div>
<div class="card mt16">
<div class="row between center" style="padding:14px 20px;border-bottom:1px solid #EFF2F7">
<span class="h3" style="font-size:14.5px">Como aparece no aplicativo</span>
<span class="meta">pré-visualização do cartão de aviso</span></div>
<div style="padding:16px 20px">
<div style="border:1px solid #EFF2F7;border-radius:10px;padding:14px 16px;max-width:430px">
<div class="row center gap10"><div class="avatar sm">CO</div>
<div class="col gap4"><span style="font-size:12px;font-weight:600;color:#2A4374">Coordenação do curso</span>
<span class="meta">16 out, 08:00</span></div></div>
<div style="font-size:13.5px;font-weight:650;color:#132A4E;margin-top:10px;line-height:1.35">
Semana Acadêmica 2026/2: programação completa</div>
<div class="meta mt6" style="line-height:1.5">A Semana Acadêmica acontece de 4 a 8 de novembro,
no câmpus. A programação traz palestras…</div>
<div class="chips mt10">{chip("Todos","todos")}{chip("SI-3A")}{chip("+3")}</div></div></div></div></div>"""
    dir_ = f"""<div style="flex:1">
<div class="card">
<div style="padding:16px 20px;border-bottom:1px solid #EFF2F7">
<span class="h3" style="font-size:14.5px">Quem vai receber</span>
<div class="meta mt4">De 1 a 20 destinos. Quem for alcançado por qualquer um deles vê o aviso
uma única vez.</div></div>
<div style="padding:16px 20px">
<div class="chips">{destinos}</div>
<div class="row gap8 mt16">
<div class="btn btn-ghost btn-sm">{ic('mais',15,'#2A4374')} Adicionar destino</div></div>
<div class="rule mt16"></div>
<div class="row between center mt16">
<div class="col gap4"><span style="font-size:13px;font-weight:600;color:#132A4E">Alcance estimado</span>
<span class="meta">usuários ativos em 2026/2</span></div>
<span style="font-size:19px;font-weight:700;color:#132A4E;letter-spacing:-.02em">412</span></div>
</div></div>

<div class="card mt16">
<div style="padding:16px 20px;border-bottom:1px solid #EFF2F7">
<span class="h3" style="font-size:14.5px">Publicação</span></div>
<div style="padding:16px 20px">
<div class="row gap10">
<div class="row center gap8" style="height:34px;padding:0 13px;border-radius:8px;
background:#EFF4FF;color:#1D4ED8;font-size:13px;font-weight:600">{ic('check',15,'#1D4ED8')}
Agendar</div>
<div class="row center gap8" style="height:34px;padding:0 13px;border-radius:8px;
border:1px solid #E4E9F2;color:#5B6B86;font-size:13px;font-weight:550">Publicar agora</div></div>
<div class="row gap10 mt16">
<div class="input" style="height:42px;flex:1">{ic('agenda',16,'#5B6B86')}
<span style="font-size:13.5px">16/10/2026</span></div>
<div class="input" style="height:42px;width:118px">{ic('relogio',16,'#5B6B86')}
<span style="font-size:13.5px">08:00</span></div></div>
<div class="meta mt10">Até lá o aviso não aparece para ninguém no aplicativo.</div></div></div>

</div>"""
    corpo = f"""<div class="content">
<div class="row center gap12">{ic('voltar',20,'#5B6B86')}
<div class="col"><div class="h1" style="font-size:22px">Novo aviso</div>
<div class="meta mt4">Rascunho salvo automaticamente · nenhuma pessoa foi notificada ainda</div>
</div><div class="grow"></div>
<div class="row gap10"><div class="btn btn-ghost">Descartar</div>
<div class="btn btn-primary">Agendar publicação</div></div></div>
<div class="row gap20 mt24" style="align-items:flex-start">{esq}{dir_}</div></div>"""
    return web(topbar("Avisos", "Coordenação") + corpo, "Avisos")


# ---------------------------------------------------------------- 05 seletor de destinos
def aviso_destinos():

    def opc(nome, info, marcado=False, tipo="turma"):
        box = ('<div style="width:18px;height:18px;border-radius:5px;background:#2563EB;'
               'display:flex;align-items:center;justify-content:center">'
               f'{ic("check",12,"#fff",2.4)}</div>' if marcado else
               '<div style="width:18px;height:18px;border-radius:5px;border:1.5px solid #D5DCE8">'
               '</div>')
        return f"""<div class="row center gap12" style="padding:11px 20px;
border-bottom:1px solid #F3F6FA">{box}
<div class="col gap4"><span style="font-size:13.5px;font-weight:550;color:#132A4E">{nome}</span>
<span class="meta">{info}</span></div></div>"""

    modal = f"""<div style="position:absolute;inset:0;background:rgba(15,28,51,.45)"></div>
<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:620px;
background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 24px 60px rgba(15,28,51,.28)">
<div style="padding:20px 24px;border-bottom:1px solid #EFF2F7">
<div class="row between center"><span class="h2" style="font-size:18px">Adicionar destino</span>
{ic('x',18,'#8A99B0')}</div>
<div class="sub mt6">Escolha grupos inteiros ou turmas específicas. Você pode combinar quantos
quiser, até 20.</div></div>
<div class="row gap20" style="padding:14px 24px 0;border-bottom:1px solid #EFF2F7">
<span class="t on" style="font-size:13.5px;font-weight:650;color:#132A4E;padding-bottom:11px;
box-shadow:inset 0 -2px 0 #2563EB">Turmas</span>
<span style="font-size:13.5px;color:#5B6B86;padding-bottom:11px">Semestres</span>
<span style="font-size:13.5px;color:#5B6B86;padding-bottom:11px">Grupos</span></div>
<div style="padding:14px 24px 0">{busca("Buscar turma pelo código ou nome", 572)}</div>
<div style="height:252px;overflow:hidden;margin-top:12px">
{opc("SI-3A — Sistemas para Internet 3A","3º semestre · 38 alunos · 4 docentes",True)}
{opc("SI-3B — Sistemas para Internet 3B","3º semestre · 35 alunos · 3 docentes",True)}
{opc("SI-4A — Sistemas para Internet 4A","4º semestre · 31 alunos · 4 docentes")}
{opc("SI-5A — Sistemas para Internet 5A","5º semestre · 27 alunos · 3 docentes")}
{opc("OPT-1 — Tópicos em Computação em Nuvem","Optativa · 22 alunos · 1 docente")}
{opc("OPT-2 — Introdução a Ciência de Dados","Optativa · 19 alunos · 1 docente")}
</div>
<div class="row between center" style="padding:16px 24px;border-top:1px solid #EFF2F7;
background:#FAFCFF">
<span class="meta">2 turmas selecionadas · 5 destinos no aviso</span>
<div class="row gap10"><div class="btn btn-ghost btn-sm">Cancelar</div>
<div class="btn btn-primary btn-sm">Adicionar 2 destinos</div></div></div></div>"""
    return com_modal(aviso_editor(), modal)


# ---------------------------------------------------------------- 06 histórico
def aviso_historico():
    def evento(tipo, quem, quando, detalhe, cor="#2563EB", ultimo=False):
        linha = "" if ultimo else ('<div style="position:absolute;left:7px;top:20px;bottom:-18px;'
                                   'width:1.5px;background:#E4E9F2"></div>')
        return f"""<div style="position:relative;padding:0 0 22px 30px">{linha}
<div style="position:absolute;left:1px;top:3px;width:13px;height:13px;border-radius:50%;
border:2.5px solid {cor};background:#fff"></div>
<div class="row center gap8"><span style="font-size:13.5px;font-weight:650;color:#132A4E">{tipo}</span>
<span class="meta">{quando}</span></div>
<div class="meta mt4">{quem}</div>
<div class="sub mt8" style="font-size:12.5px;background:#F7F9FC;border-radius:8px;padding:10px 12px">
{detalhe}</div></div>"""

    def versao(n, data, atual=False):
        selo = '<span class="badge b-blue">Atual</span>' if atual else ""
        return f"""<div class="row between center" style="padding:12px 16px;
border:1px solid {'#C9D9FB' if atual else '#EFF2F7'};border-radius:10px;margin-bottom:8px;
background:{'#F7FAFF' if atual else '#fff'}">
<div class="col gap4"><span style="font-size:13px;font-weight:600;color:#132A4E">Versão {n}</span>
<span class="meta">{data}</span></div>{selo}</div>"""

    diff = """<div class="sub" style="font-size:12.5px">
<span style="color:#8A99B0">Título</span><br>
<span style="background:#FCECEC;color:#8F2222;text-decoration:line-through;padding:1px 4px;
border-radius:4px">Entrega do trabalho de Redes adiada para 23/10</span><br>
<span style="background:#E9F6EE;color:#15803D;padding:1px 4px;border-radius:4px">
Entrega do trabalho de Redes adiada para 30/10</span></div>"""

    corpo = f"""<div class="content">
<div class="row center gap12">{ic('voltar',20,'#5B6B86')}
<div class="col"><div class="h1" style="font-size:22px">Entrega do trabalho de Redes adiada para 30/10</div>
<div class="meta mt4">Ricardo Lemos · publicado 07/10, 09:12 · editado 07/10, 14:05</div></div>
<div class="grow"></div><div class="row gap10">
<div class="btn btn-ghost btn-sm">{ic('arquivo',15,'#2A4374')} Arquivar</div>
<div class="btn btn-ghost btn-sm">{ic('lapis',15,'#2A4374')} Editar</div></div></div>

<div class="tabs mt20"><span class="t">Conteúdo</span><span class="t on">Histórico e versões</span>
<span class="t">Alcance</span></div>

<div class="row gap20 mt20" style="align-items:flex-start">
<div style="flex:1.5">{card("Linha do tempo",
  evento("Aviso editado","Ricardo Lemos · docente","07/10, 14:05", diff) +
  evento("Destino alterado","Ricardo Lemos · docente","07/10, 14:05",
         'Removido <b>SI-3B</b> · mantido <b>SI-3A</b>') +
  evento("Aviso publicado","Ricardo Lemos · docente","07/10, 09:12",
         "Publicado imediatamente para 1 destino: SI-3A","#15803D") +
  evento("Aviso criado","Ricardo Lemos · docente","07/10, 09:08",
         "Versão 1 registrada com título, conteúdo e destinos.","#2A4374",ultimo=True))}
<div class="card mt16" style="padding:16px 20px">
<div class="row center gap10">{ic('info',16,'#5B6B86')}
<span class="meta" style="color:#5B6B86">Arquivar, desarquivar e excluir também entram nesta
linha do tempo. Nada aqui pode ser editado depois.</span></div></div></div>
<div style="flex:1">{card("Versões",
  versao(2,"07/10, 14:05 · Ricardo Lemos",atual=True) +
  versao(1,"07/10, 09:08 · Ricardo Lemos") +
  '<div class="row gap8 mt8" style="padding:11px 12px;background:#F7F9FC;border-radius:9px">' +
  ic('info',15,'#5B6B86') +
  '<span class="meta" style="color:#5B6B86;line-height:1.5">Versões e eventos não podem ser '
  'alterados nem apagados, mesmo depois da exclusão do aviso.</span></div>')}</div></div></div>"""
    return web(topbar("Avisos", "Coordenação") + corpo, "Avisos")


# ---------------------------------------------------------------- 07 turmas
def turmas():
    def linha(cod, nome, semestre, periodo, alunos, docentes, insc, ativa=True):
        selo_insc = ('<span class="badge b-ativo">Abertas</span>' if insc
                     else '<span class="badge b-arq">Fechadas</span>')
        selo_at = ('<span class="badge b-blue">Ativa</span>' if ativa
                   else '<span class="badge b-arq">Inativa</span>')
        return f"""<tr><td><span class="strong">{cod}</span></td><td>{nome}</td>
<td>{semestre}</td><td>{periodo}</td><td>{alunos}</td><td>{docentes}</td>
<td>{selo_insc}</td><td>{selo_at}</td>
<td><div class="row gap10">{ic('lapis',17,'#5B6B86')}{ic('usuarios',17,'#5B6B86')}</div></td></tr>"""

    tabela = f"""<table class="tbl">
<thead><tr><th style="width:90px">Código</th><th>Turma</th><th style="width:110px">Semestre</th>
<th style="width:100px">Período</th><th style="width:80px">Alunos</th>
<th style="width:90px">Docentes</th><th style="width:110px">Inscrições</th>
<th style="width:100px">Situação</th><th style="width:80px"></th></tr></thead><tbody>
{linha("SI-3A","Sistemas para Internet 3A","3º","2026/2","38","4",True)}
{linha("SI-3B","Sistemas para Internet 3B","3º","2026/2","35","3",True)}
{linha("SI-4A","Sistemas para Internet 4A","4º","2026/2","31","4",True)}
{linha("SI-5A","Sistemas para Internet 5A","5º","2026/2","27","3",False)}
{linha("SI-6A","Sistemas para Internet 6A","6º","2026/2","24","5",False)}
{linha("OPT-1","Tópicos em Computação em Nuvem","Optativa","2026/2","22","1",True)}
{linha("OPT-2","Introdução a Ciência de Dados","Optativa","2026/2","19","1",True)}
{linha("SI-2A","Sistemas para Internet 2A","2º","2026/1","0","0",False,ativa=False)}
</tbody></table>"""
    corpo = f"""<div class="content">
<div class="row between center">
<div class="col"><div class="h1">Turmas</div>
<div class="sub mt6">Turmas acadêmicas do curso. Desativar uma turma preserva os vínculos, mas
interrompe a entrega dos avisos dela.</div></div>
<div class="btn btn-primary">{ic('mais',18,'#fff')} Nova turma</div></div>
<div class="row between center mt20">
<div class="tabs" style="border:none"><span class="t on">Ativas</span>
<span class="t">Inativas</span><span class="t">Todas</span></div>
{busca("Buscar turma")}</div>
<div class="card mt16" style="padding:14px 0 0">{tabela}
<div class="row between center" style="padding:14px 20px;border-top:1px solid #EFF2F7">
<span class="meta">12 turmas em 2026/2</span></div></div></div>"""
    return web(topbar("Turmas", "Coordenação") + corpo, "Turmas")


# ---------------------------------------------------------------- 08 detalhe da turma
def turma_detalhe():
    def pessoa(nome, user, papel, desde, ini, cor="blue"):
        return f"""<tr><td><div class="row center gap10"><div class="avatar sm {cor}">{ini}</div>
<div class="col gap4"><span class="strong">{nome}</span><span class="meta">{user}</span></div>
</div></td><td><span class="badge {'b-blue' if papel=='Aluno' else 'b-pend'}">{papel}</span></td>
<td>{desde}</td><td><span style="font-size:12.5px;font-weight:600;color:#B91C1C">
Remover vínculo</span></td></tr>"""

    tabela = f"""<table class="tbl">
<thead><tr><th>Pessoa</th><th style="width:110px">Papel</th>
<th style="width:160px">Vinculado desde</th><th style="width:150px"></th></tr></thead><tbody>
{pessoa("Ricardo Lemos","ricardo.lemos","Docente","01/08/2026","RL","")}
{pessoa("Helena Prado","helena.prado","Docente","01/08/2026","HP","")}
{pessoa("Júlia Santos","julia.santos","Aluno","03/09/2026","JS")}
{pessoa("Caio Ribeiro","caio.ribeiro","Aluno","01/08/2026","CR")}
{pessoa("Ana Beatriz Lopes","ana.lopes","Aluno","01/08/2026","AL")}
{pessoa("Marcos Vinícius Reis","marcos.reis","Aluno","01/08/2026","MR")}
</tbody></table>"""
    info = f"""<div class="row gap32" style="gap:36px">
<div class="col gap4"><span class="meta">Código</span>
<span class="h3" style="font-size:14.5px">SI-3A</span></div>
<div class="col gap4"><span class="meta">Semestre do curso</span>
<span class="h3" style="font-size:14.5px">3º</span></div>
<div class="col gap4"><span class="meta">Período letivo</span>
<span class="h3" style="font-size:14.5px">2026/2</span></div>
<div class="col gap4"><span class="meta">Vínculos</span>
<span class="h3" style="font-size:14.5px">38 alunos · 4 docentes</span></div>
<div class="col gap4"><span class="meta">Inscrições</span>
<span class="badge b-ativo mt4">Abertas</span></div>
<div class="col gap4"><span class="meta">Situação</span>
<span class="badge b-blue mt4">Ativa</span></div></div>"""
    corpo = f"""<div class="content">
<div class="row center gap12">{ic('voltar',20,'#5B6B86')}
<div class="col"><div class="h1" style="font-size:22px">Sistemas para Internet 3A</div>
<div class="meta mt4">Turma acadêmica · criada em 01/08/2026 por Marina Duarte</div></div>
<div class="grow"></div><div class="row gap10">
<div class="btn btn-ghost btn-sm">Fechar inscrições</div>
<div class="btn btn-ghost btn-sm">{ic('lapis',15,'#2A4374')} Editar turma</div></div></div>

<div class="card mt20" style="padding:18px 20px">{info}</div>

<div class="tabs mt24"><span class="t on">Vínculos</span><span class="t">Horários</span>
<span class="t">Avisos da turma</span><span class="t">Solicitações</span></div>

<div class="row between center mt16">
{busca("Buscar pessoa na turma")}
<div class="row gap10"><div class="btn btn-ghost btn-sm">{ic('mais',15,'#2A4374')} Vincular docente</div>
<div class="btn btn-primary btn-sm">{ic('mais',15,'#fff')} Vincular aluno</div></div></div>

<div class="card mt16" style="padding:14px 0 0">{tabela}
<div class="row between center" style="padding:14px 20px;border-top:1px solid #EFF2F7">
<span class="meta">Mostrando 6 de 42 vínculos</span></div></div></div>"""
    return web(topbar("Turmas", "Coordenação") + corpo, "Turmas")


# ---------------------------------------------------------------- 09 solicitações
def solicitacoes():
    def linha(nome, user, turma, quando, ini, estado=None, nota=None):
        if estado == "aprovada":
            acao = ('<span class="badge b-ativo">Aprovada</span>'
                    '<div class="meta mt4">por Marina Duarte · hoje</div>')
        elif estado == "recusada":
            acao = ('<span class="badge b-exc">Recusada</span>'
                    f'<div class="meta mt4">{nota}</div>')
        else:
            acao = """<div class="row gap8">
<div class="btn btn-sm btn-primary">Aprovar</div>
<div class="btn btn-sm btn-ghost">Recusar</div></div>"""
        return f"""<tr><td><div class="row center gap10"><div class="avatar sm blue">{ini}</div>
<div class="col gap4"><span class="strong">{nome}</span><span class="meta">{user}</span></div>
</div></td><td>{turma}</td><td>{quando}</td><td style="text-align:right">{acao}</td></tr>"""

    tabela = f"""<table class="tbl">
<thead><tr><th>Aluno</th><th style="width:300px">Turma</th><th style="width:150px">Solicitada em</th>
<th style="width:260px;text-align:right">Decisão</th></tr></thead><tbody>
{linha("Júlia Santos","julia.santos","Introdução a Ciência de Dados","12/10, 20:14","JS")}
{linha("Caio Ribeiro","caio.ribeiro","Sistemas para Internet 4A","11/10, 09:02","CR")}
{linha("Ana Beatriz Lopes","ana.lopes","Desenvolvimento de Jogos","09/10, 14:48","AL")}
{linha("Marcos Vinícius Reis","marcos.reis","Sistemas para Internet 4A","08/10, 11:20","MR")}
{linha("Larissa Mendes","larissa.mendes","Tópicos em Computação em Nuvem","07/10, 08:05","LM")}
{linha("Pedro Henrique Alves","pedro.alves","Sistemas para Internet 3A","05/10, 19:31","PA",
       "aprovada")}
{linha("Rafaela Nunes","rafaela.nunes","Desenvolvimento de Jogos","02/10, 10:12","RN","recusada",
       "Motivo: turma sem vagas para outro semestre")}
</tbody></table>"""
    corpo = f"""<div class="content">
<div class="col"><div class="h1">Solicitações de inscrição</div>
<div class="sub mt6">Aprovar cria o vínculo do aluno com a turma na mesma hora. Recusar permite
registrar o motivo, que o aluno vê no aplicativo.</div></div>

<div class="row between center mt20">
<div class="tabs" style="border:none"><span class="t on">Pendentes (7)</span>
<span class="t">Decididas</span><span class="t">Canceladas pelo aluno</span></div>
<div class="row gap10">{busca("Buscar aluno")}
<div class="row center gap8" style="height:36px;padding:0 13px;border:1px solid #E4E9F2;
border-radius:9px">{ic('filtro',16,'#5B6B86')}
<span style="font-size:13px;font-weight:550;color:#2A4374">Turma</span></div></div></div>

<div class="card mt16" style="padding:14px 0 0">{tabela}
<div class="row between center" style="padding:14px 20px;border-top:1px solid #EFF2F7">
<span class="meta">2 solicitações esperando há mais de 3 dias</span></div></div></div>"""
    return web(topbar("Solicitações", "Coordenação") + corpo, "Solicitações")


# ---------------------------------------------------------------- 10 usuários (admin)
def usuarios():
    NAV_ADM = [
        ("Acompanhar", [("painel", "Painel", None)]),
        ("Comunicação", [("avisos", "Avisos", None), ("agenda", "Agenda", None)]),
        ("Acadêmico", [("turmas", "Turmas", None), ("horarios", "Horários", None),
                       ("solicitacoes", "Solicitações", "7")]),
        ("Administração", [("usuarios", "Usuários", None), ("escudo", "Auditoria", None)]),
    ]

    def linha(nome, user, perfil, classe, turmas, ultimo, ini, inativo=False):
        est = ('<span class="badge b-arq">Inativo</span>' if inativo
               else '<span class="badge b-ativo">Ativo</span>')
        return f"""<tr><td><div class="row center gap10"><div class="avatar sm">{ini}</div>
<div class="col gap4"><span class="strong">{nome}</span><span class="meta">{user}</span></div>
</div></td><td><span class="badge {classe}">{perfil}</span></td><td>{turmas}</td>
<td>{ultimo}</td><td>{est}</td>
<td><div class="row gap10">{ic('lapis',17,'#5B6B86')}{ic('escudo',17,'#5B6B86')}</div></td></tr>"""

    tabela = f"""<table class="tbl">
<thead><tr><th>Usuário</th><th style="width:150px">Perfil</th><th style="width:170px">Vínculos</th>
<th style="width:160px">Último acesso</th><th style="width:110px">Situação</th>
<th style="width:80px"></th></tr></thead><tbody>
{linha("Paulo Ferraz","paulo.ferraz","Administrador","b-exc","—","hoje, 08:12","PF")}
{linha("Marina Duarte","marina.duarte","Coordenação","b-pend","—","hoje, 07:55","MD")}
{linha("Ricardo Lemos","ricardo.lemos","Docente","b-blue","4 turmas","ontem, 21:40","RL")}
{linha("Helena Prado","helena.prado","Docente","b-blue","3 turmas","ontem, 19:02","HP")}
{linha("Júlia Santos","julia.santos","Aluno","b-arq","3 turmas","hoje, 09:41","JS")}
{linha("Caio Ribeiro","caio.ribeiro","Aluno","b-arq","2 turmas","12/10","CR")}
{linha("Rafaela Nunes","rafaela.nunes","Aluno","b-arq","1 turma","28/09","RN",inativo=True)}
</tbody></table>"""
    corpo = f"""<div class="content">
<div class="row between center">
<div class="col"><div class="h1">Usuários</div>
<div class="sub mt6">Todo usuário entra como aluno no primeiro acesso. Só a administração muda o
perfil ou desativa alguém.</div></div></div>

<div class="row between center mt20">
<div class="tabs" style="border:none"><span class="t on">Todos</span>
<span class="t">Administração</span><span class="t">Coordenação</span><span class="t">Docentes</span>
<span class="t">Alunos</span><span class="t">Inativos</span></div>
{busca("Buscar por nome ou usuário")}</div>

<div class="card mt16" style="padding:14px 0 0">{tabela}
<div class="row between center" style="padding:14px 20px;border-top:1px solid #EFF2F7">
<span class="meta">Mostrando 7 de 486 usuários</span>
<div class="row gap8"><span class="meta">Anterior</span>
<span style="font-size:12.5px;font-weight:600;color:#2563EB">Próxima</span></div></div></div></div>"""
    return web(topbar("Usuários", "Administração", ic('sino', 20, '#5B6B86')) + corpo,
               "Usuários", NAV_ADM, ADM)


# ---------------------------------------------------------------- 11 alterar perfil
def alterar_perfil():

    def opcao(nome, desc, marcado=False):
        ponto = ('<div style="width:17px;height:17px;border-radius:50%;border:5px solid #2563EB">'
                 '</div>' if marcado else
                 '<div style="width:17px;height:17px;border-radius:50%;border:1.5px solid #D5DCE8">'
                 '</div>')
        borda = "#C9D9FB" if marcado else "#EFF2F7"
        fundo = "#F7FAFF" if marcado else "#fff"
        return f"""<div class="row center gap12" style="padding:13px 15px;border:1px solid {borda};
background:{fundo};border-radius:10px;margin-bottom:8px">{ponto}
<div class="col gap4"><span style="font-size:13.5px;font-weight:600;color:#132A4E">{nome}</span>
<span class="meta">{desc}</span></div></div>"""

    modal = f"""<div style="position:absolute;inset:0;background:rgba(15,28,51,.45)"></div>
<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:540px;
background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 24px 60px rgba(15,28,51,.28)">
<div style="padding:20px 24px;border-bottom:1px solid #EFF2F7">
<div class="row between center"><span class="h2" style="font-size:18px">Alterar perfil de acesso</span>
{ic('x',18,'#8A99B0')}</div>
<div class="row center gap10 mt14"><div class="avatar sm">RL</div>
<div class="col gap4"><span style="font-size:13.5px;font-weight:600;color:#132A4E">Ricardo Lemos</span>
<span class="meta">ricardo.lemos · docente desde 01/08/2026</span></div></div></div>
<div style="padding:18px 24px">
{opcao("Administrador","Gerencia usuários, perfis e tudo que a coordenação faz.")}
{opcao("Coordenação","Gerencia turmas, vínculos, solicitações e avisos para qualquer público.")}
{opcao("Docente","Publica avisos e aprova solicitações apenas das turmas em que leciona.",True)}
{opcao("Aluno","Só consulta: avisos, agenda, horários e as próprias turmas.")}
<div class="row gap8 mt8" style="padding:12px 13px;background:#FDF4E6;border-radius:9px">
{ic('info',16,'#B45309')}<span class="meta" style="color:#B45309;line-height:1.5">
A mudança vale já na próxima ação da pessoa, sem precisar sair e entrar de novo.</span></div></div>
<div class="row between center" style="padding:16px 24px;border-top:1px solid #EFF2F7;
background:#FAFCFF">
<span style="font-size:12.5px;font-weight:600;color:#B91C1C">Desativar usuário</span>
<div class="row gap10"><div class="btn btn-ghost btn-sm">Cancelar</div>
<div class="btn btn-primary btn-sm">Salvar perfil</div></div></div></div>"""
    return com_modal(usuarios(), modal)


# ---------------------------------------------------------------- 12 agenda
def agenda():
    def ev(dia, mes, titulo, tipo, hora, local, chips, cor="#2563EB"):
        return f"""<div class="row gap16" style="padding:15px 20px;border-bottom:1px solid #EFF2F7;align-items:stretch">
<div class="col center" style="width:52px;flex:0 0 52px">
<span style="font-size:20px;font-weight:700;color:#132A4E;letter-spacing:-.02em">{dia}</span>
<span class="meta" style="font-size:11px">{mes}</span></div>
<div style="width:2px;background:{cor};border-radius:1px;opacity:.6"></div>
<div class="col grow gap6">
<span class="meta" style="color:{cor};font-weight:650">{tipo}</span>
<span class="h3" style="font-size:14.5px">{titulo}</span>
<div class="row gap14 mt2">
<span class="meta row center gap4">{ic('relogio',13,'#8A99B0')} {hora}</span>
<span class="meta row center gap4">{ic('local',13,'#8A99B0')} {local}</span></div></div>
<div class="chips" style="width:260px">{chips}</div>
<div class="row gap10" style="width:60px">{ic('lapis',17,'#5B6B86')}{ic('arquivo',17,'#5B6B86')}
</div></div>"""
    corpo = f"""<div class="content">
<div class="row between center">
<div class="col"><div class="h1">Agenda</div>
<div class="sub mt6">Eventos, bancas, provas e datas importantes. O público funciona igual ao dos
avisos.</div></div>
<div class="btn btn-primary">{ic('mais',18,'#fff')} Novo evento</div></div>

<div class="row between center mt20">
<div class="tabs" style="border:none"><span class="t on">Próximos</span>
<span class="t">Mês</span><span class="t">Realizados</span></div>
<div class="row gap10">
<div class="row center gap8" style="height:36px;padding:0 13px;border:1px solid #E4E9F2;
border-radius:9px">{ic('filtro',16,'#5B6B86')}
<span style="font-size:13px;font-weight:550;color:#2A4374">Tipo</span></div>
{busca("Buscar evento",240)}</div></div>

<div class="card mt16" style="padding:8px 0 0">
{ev("16","out","Prova de Banco de Dados II","Prova","19:10 – 20:50","Lab 4",
    chip("SI-3A"),"#B45309")}
{ev("21","out","Palestra: carreira em infraestrutura em nuvem","Palestra","19:00 – 21:00",
    "Auditório",chip("Todos","todos"))}
{ev("24","out","Defesas de TCC II","Banca","14:00 – 18:00","Sala 203",
    chip("6º semestre","semestre")+chip("Docentes","docentes"))}
{ev("31","out","Prazo final: trabalho de Redes","Data importante","até 23:59","Entrega on-line",
    chip("SI-3A"),"#2A4374")}
{ev("04","nov","Semana Acadêmica 2026/2","Evento","08:00 – 22:00","Câmpus",
    chip("Todos","todos"))}
{ev("12","dez","Formatura da turma 2026/2","Formatura","20:00 – 23:00","Teatro municipal",
    chip("8º semestre","semestre")+chip("Docentes","docentes"),"#2A4374")}
</div></div>"""
    return web(topbar("Agenda", "Coordenação") + corpo, "Agenda")


# ---------------------------------------------------------------- 13 horários
def horarios():
    dias = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]
    grade = {
        "19:10": ["Banco de Dados II|Lab 4|Helena Prado|#2563EB",
                  "Redes de Computadores|Lab 2|Ricardo Lemos|#2563EB",
                  "Banco de Dados II|Lab 4|Helena Prado|#2563EB",
                  "Programação Web|Lab 3|Ricardo Lemos|#2563EB", ""],
        "20:00": ["", "", "", "", "Estatística Aplicada|Sala 201|Sérgio Nunes|#2A4374"],
        "20:50": ["intervalo", "intervalo", "intervalo", "intervalo", "intervalo"],
        "21:00": ["Engenharia de Software|Sala 203|Camila Ávila|#2A4374", "",
                  "Interface Humano-Computador|Sala 205|Camila Ávila|#2A4374",
                  "Projeto Integrador|Lab 3|Ricardo Lemos|#2563EB", ""],
        "21:50": ["", "Engenharia de Software|Sala 203|Camila Ávila|#2A4374", "", "", ""],
    }
    cab = '<div style="width:72px;flex:0 0 72px"></div>' + "".join(
        f'<div style="flex:1;padding:0 6px"><div class="sec-title" style="font-size:12.5px;'
        f'color:#2A4374">{d}</div></div>' for d in dias)
    linhas = ""
    for hora, celulas in grade.items():
        cels = ""
        for c in celulas:
            if c == "intervalo":
                cels += ('<div style="flex:1;padding:0 6px"><div style="height:26px;'
                         'background:#F7F9FC;border-radius:6px;display:flex;align-items:center;'
                         'justify-content:center"><span class="meta" '
                         'style="font-size:11px">Intervalo</span></div></div>')
            elif c:
                disc, local, prof, cor = c.split("|")
                cels += f"""<div style="flex:1;padding:0 6px"><div style="background:#F7FAFF;
border-left:2px solid {cor};border-radius:0 8px 8px 0;padding:14px 12px;min-height:76px">
<div style="font-size:12.5px;font-weight:600;color:#132A4E;line-height:1.3">{disc}</div>
<div class="meta mt4">{local} · {prof}</div></div></div>"""
            else:
                cels += ('<div style="flex:1;padding:0 6px"><div style="height:76px;'
                         'border:1px dashed #EDF1F7;border-radius:8px"></div></div>')
        linhas += f"""<div class="row" style="align-items:stretch;padding:8px 0;
border-top:1px solid #F3F6FA">
<div style="width:72px;flex:0 0 72px;padding-left:4px">
<span class="meta" style="font-weight:600">{hora}</span></div>{cels}</div>"""
    corpo = f"""<div class="content">
<div class="row between center">
<div class="col"><div class="h1">Horários</div>
<div class="sub mt6">Grade semanal da turma. Os alunos vinculados veem esta mesma grade no
aplicativo.</div></div>
<div class="btn btn-primary">{ic('mais',18,'#fff')} Nova aula</div></div>

<div class="row gap10 mt20">
<div class="row center gap8" style="height:36px;padding:0 13px;border:1px solid #E4E9F2;
border-radius:9px;background:#fff">
<span style="font-size:13px;font-weight:600;color:#132A4E">SI-3A — Sistemas para Internet 3A</span>
{ic('seta',14,'#8A99B0')}</div>
<div class="row center gap8" style="height:36px;padding:0 13px;border:1px solid #E4E9F2;
border-radius:9px;background:#fff">
<span style="font-size:13px;font-weight:550;color:#5B6B86">2026/2</span></div></div>

<div class="card mt16" style="padding:16px 18px 18px">
<div class="row" style="padding-bottom:8px">{cab}</div>{linhas}</div>

<div class="row between center mt16">
<div class="row gap8">
<span class="chip"><span class="dot"></span>Aula prática</span>
<span class="chip t-semestre"><span class="dot"></span>Aula teórica</span></div>
<span class="meta">Grade atualizada em 02/08/2026 por Marina Duarte</span></div>

<div class="row gap16 mt16" style="align-items:flex-start">
<div style="flex:1.4">{card("Docentes nesta grade",
  '<div class="row gap20">' +
  "".join(f'<div class="row center gap10"><div class="avatar sm">{i}</div>'
          f'<div class="col gap4"><span style="font-size:13px;font-weight:600;color:#132A4E">{n}'
          f'</span><span class="meta">{d}</span></div></div>'
          for i, n, d in [("HP","Helena Prado","Banco de Dados II"),
                          ("RL","Ricardo Lemos","Redes · Programação Web"),
                          ("CA","Camila Ávila","Eng. de Software · IHC"),
                          ("SN","Sérgio Nunes","Estatística Aplicada")]) + '</div>')}</div>
<div style="flex:1">{card("Mudou alguma aula?",
  '<div class="sub" style="color:#5B6B86">Ajuste a grade aqui e avise a turma pelo módulo de '
  'avisos — a mudança de horário não gera aviso automático.</div>'
  '<div class="btn btn-ghost btn-sm mt16">Criar aviso para a SI-3A</div>')}</div></div></div>"""
    return web(topbar("Horários", "Coordenação") + corpo, "Horários")


# ---------------------------------------------------------------- 14 painel docente
def painel_docente():
    def turma(cod, nome, alunos, pendentes):
        pend = (f'<span class="badge b-pend">{pendentes} solicitações</span>' if pendentes
                else '<span class="meta">sem pendências</span>')
        return f"""<div class="row center gap12" style="padding:13px 0;border-bottom:1px solid #EFF2F7">
<div style="width:44px;height:38px;border-radius:9px;background:#EFF4FF;color:#1D4ED8;
font-size:11.5px;font-weight:700;display:flex;align-items:center;justify-content:center">{cod}</div>
<div class="col grow gap4"><span style="font-size:13.5px;font-weight:600;color:#132A4E">{nome}</span>
<span class="meta">{alunos} alunos</span></div>{pend}</div>"""

    def meu_aviso(titulo, destinos, quando, selo):
        return f"""<div class="row center gap12" style="padding:13px 0;border-bottom:1px solid #EFF2F7">
<div class="col grow gap6"><span style="font-size:13.5px;font-weight:600;color:#132A4E">{titulo}</span>
<div class="chips">{destinos}</div></div>
<span class="meta" style="width:100px">{quando}</span>{selo}</div>"""

    corpo = f"""<div class="content">
<div class="row between center">
<div class="col"><div class="h1">Bom dia, Ricardo</div>
<div class="sub mt6">Você leciona em 4 turmas. Pode publicar avisos e decidir solicitações apenas
nelas.</div></div>
<div class="btn btn-primary">{ic('mais',18,'#fff')} Novo aviso</div></div>

<div class="row gap16 mt24" style="align-items:flex-start">
<div style="flex:1">{card("Minhas turmas",
  turma("SI<br>3A","Sistemas para Internet 3A","38",2) +
  turma("SI<br>4A","Sistemas para Internet 4A","31",0) +
  turma("SI<br>6A","Sistemas para Internet 6A","24",0) +
  turma("OPT<br>1","Tópicos em Computação em Nuvem","22",0), pad=4)}</div>
<div style="flex:1.4">{card("Meus avisos",
  meu_aviso("Entrega do trabalho de Redes adiada para 30/10",chip("SI-3A"),"07/10",
            '<span class="badge b-ativo">Ativo</span>') +
  meu_aviso("Lista de exercícios 4 disponível",chip("SI-4A"),"03/10",
            '<span class="badge b-ativo">Ativo</span>') +
  meu_aviso("Aula de laboratório antecipada",chip("SI-3A")+chip("SI-6A"),"29/09",
            '<span class="badge b-ativo">Ativo</span>') +
  meu_aviso("Aula cancelada em 28/08",chip("SI-3A"),"28/08",
            '<span class="badge b-arq">Arquivado</span>'),
  '<span class="btn-quiet" style="font-size:13px">Ver todos</span>', pad=4)}</div></div>

<div class="row gap16 mt20" style="align-items:flex-start">
<div style="flex:1">{card("Solicitações das minhas turmas",
  '<div class="row center gap12" style="padding:12px 0;border-bottom:1px solid #EFF2F7">'
  '<div class="avatar sm blue">PA</div><div class="col grow gap4">'
  '<span style="font-size:13px;font-weight:600;color:#132A4E">Pedro Henrique Alves</span>'
  '<span class="meta">SI-3A · há 1 dia</span></div>'
  '<div class="row gap6"><div class="btn btn-sm btn-primary" style="height:30px;padding:0 11px">'
  'Aprovar</div><div class="btn btn-sm btn-ghost" style="height:30px;padding:0 11px">Recusar</div>'
  '</div></div>'
  '<div class="row center gap12" style="padding:12px 0">'
  '<div class="avatar sm blue">LM</div><div class="col grow gap4">'
  '<span style="font-size:13px;font-weight:600;color:#132A4E">Larissa Mendes</span>'
  '<span class="meta">OPT-1 · há 6 dias</span></div>'
  '<div class="row gap6"><div class="btn btn-sm btn-primary" style="height:30px;padding:0 11px">'
  'Aprovar</div><div class="btn btn-sm btn-ghost" style="height:30px;padding:0 11px">Recusar</div>'
  '</div></div>',
  '<span class="badge b-pend">2 pendentes</span>', pad=4)}</div>
<div style="flex:1">{card("Próximos na agenda",
  '<div class="row center gap12" style="padding:12px 0;border-bottom:1px solid #EFF2F7">'
  '<div class="col center" style="width:44px"><span style="font-size:17px;font-weight:700;'
  'color:#132A4E">16</span><span class="meta" style="font-size:11px">out</span></div>'
  '<div class="col grow gap4"><span style="font-size:13px;font-weight:600;color:#132A4E">'
  'Prova de Banco de Dados II</span><span class="meta">19:10 · Lab 4 · SI-3A</span></div></div>'
  '<div class="row center gap12" style="padding:12px 0">'
  '<div class="col center" style="width:44px"><span style="font-size:17px;font-weight:700;'
  'color:#132A4E">24</span><span class="meta" style="font-size:11px">out</span></div>'
  '<div class="col grow gap4"><span style="font-size:13px;font-weight:600;color:#132A4E">'
  'Defesas de TCC II</span><span class="meta">14:00 · Sala 203 · 6º semestre</span></div></div>',
  pad=4)}</div></div>

<div class="mt16">{card("O que seu perfil permite",
  '<div class="row gap32" style="gap:40px">' +
  "".join(f'<div class="col gap6" style="flex:1"><div class="row center gap8">{m}'
          f'<span style="font-size:13px;font-weight:600;color:#132A4E">{t}</span></div>'
          f'<span class="sub" style="font-size:12.5px;color:#5B6B86">{d}</span></div>'
          for m, t, d in [
            (ic('check',16,'#15803D'), "Publicar para suas turmas",
             "Avisos e eventos com destino nas 4 turmas em que você leciona."),
            (ic('check',16,'#15803D'), "Decidir solicitações",
             "Aprovar ou recusar inscrições apenas nessas mesmas turmas."),
            (ic('x',16,'#B91C1C'), "Publicar para todos ou por semestre",
             "Esses destinos são da coordenação e da administração."),
            (ic('x',16,'#B91C1C'), "Editar avisos de outras pessoas",
             "Você edita, arquiva e exclui somente o que publicou."),
          ]) + '</div>')}</div></div>"""
    return web(topbar("Painel", "Docente · Ricardo Lemos", ic('sino', 20, '#5B6B86')) + corpo,
               "Painel", NAV_DOC, DOC)


# ---------------------------------------------------------------- 15 editor docente
def aviso_editor_docente():
    bloqueado = """<div class="row center gap12" style="padding:12px 14px;border:1px dashed #E4E9F2;
border-radius:10px;margin-bottom:8px;opacity:.6">
<div style="width:17px;height:17px;border-radius:5px;border:1.5px solid #D5DCE8"></div>
<div class="col gap4"><span style="font-size:13px;font-weight:550;color:#5B6B86">{0}</span>
<span class="meta">{1}</span></div>
<div class="grow"></div><span class="meta">Indisponível</span></div>"""

    def turma_opc(nome, info, marcado):
        box = ('<div style="width:17px;height:17px;border-radius:5px;background:#2563EB;'
               'display:flex;align-items:center;justify-content:center">'
               f'{ic("check",11,"#fff",2.6)}</div>' if marcado else
               '<div style="width:17px;height:17px;border-radius:5px;border:1.5px solid #D5DCE8">'
               '</div>')
        return f"""<div class="row center gap12" style="padding:12px 14px;
border:1px solid {'#C9D9FB' if marcado else '#EFF2F7'};border-radius:10px;margin-bottom:8px;
background:{'#F7FAFF' if marcado else '#fff'}">{box}
<div class="col gap4"><span style="font-size:13px;font-weight:600;color:#132A4E">{nome}</span>
<span class="meta">{info}</span></div></div>"""

    dir_ = f"""<div style="flex:1">
<div class="card">
<div style="padding:16px 20px;border-bottom:1px solid #EFF2F7">
<span class="h3" style="font-size:14.5px">Quem vai receber</span>
<div class="meta mt4">Como docente, você publica para as turmas em que leciona.</div></div>
<div style="padding:16px 20px">
{turma_opc("SI-3A — Sistemas para Internet 3A","3º semestre · 38 alunos",True)}
{turma_opc("SI-4A — Sistemas para Internet 4A","4º semestre · 31 alunos",False)}
{turma_opc("SI-6A — Sistemas para Internet 6A","6º semestre · 24 alunos",False)}
{turma_opc("OPT-1 — Tópicos em Computação em Nuvem","Optativa · 22 alunos",False)}
<div class="rule mt8" style="margin-bottom:12px"></div>
{bloqueado.format("Todos os usuários","Apenas coordenação e administração")}
{bloqueado.format("Semestre inteiro","Apenas coordenação e administração")}
{bloqueado.format("Todos os docentes","Apenas coordenação e administração")}
</div></div>
<div class="card mt16" style="padding:16px 20px">
<div class="row between center">
<div class="col gap4"><span style="font-size:13px;font-weight:600;color:#132A4E">Publicação</span>
<span class="meta">imediata, assim que você publicar</span></div>
<span style="font-size:12.5px;font-weight:600;color:#2563EB">Agendar</span></div></div></div>"""
    esq = f"""<div style="flex:1.6">
<label class="field"><span class="lbl">Título</span>
<div class="input">Lista de exercícios 5 — entrega até 28/10</div></label>
<label class="field mt20"><span class="lbl">Conteúdo</span>
<div class="input area" style="height:250px;line-height:1.6;color:#263A5B">
A lista 5 cobre roteamento e sub-redes, e está no Moodle junto com o gabarito da lista
anterior.<br><br>Dúvidas podem ser trazidas na monitoria de quinta, das 18h às 19h, no Lab 2.
<span style="color:#C3CCDA">|</span></div></label>
<div class="meta mt8">A turma recebe no aplicativo assim que você publicar.</div>
<div class="card mt16">
<div class="row between center" style="padding:14px 20px;border-bottom:1px solid #EFF2F7">
<span class="h3" style="font-size:14.5px">Como aparece no aplicativo</span>
<span class="meta">pré-visualização do cartão de aviso</span></div>
<div style="padding:16px 20px">
<div style="border:1px solid #EFF2F7;border-radius:10px;padding:14px 16px;max-width:430px">
<div class="row center gap10"><div class="avatar sm">RL</div>
<div class="col gap4"><span style="font-size:12px;font-weight:600;color:#2A4374">Ricardo Lemos</span>
<span class="meta">Docente · agora</span></div></div>
<div style="font-size:13.5px;font-weight:650;color:#132A4E;margin-top:10px;line-height:1.35">
Lista de exercícios 5 — entrega até 28/10</div>
<div class="meta mt6" style="line-height:1.5">A lista 5 cobre roteamento e sub-redes, e está no
Moodle junto com o gabarito…</div>
<div class="chips mt10">{chip("SI-3A")}</div></div></div></div></div>"""
    corpo = f"""<div class="content">
<div class="row center gap12">{ic('voltar',20,'#5B6B86')}
<div class="col"><div class="h1" style="font-size:22px">Novo aviso</div>
<div class="meta mt4">Ricardo Lemos · docente</div></div>
<div class="grow"></div><div class="row gap10">
<div class="btn btn-ghost">Descartar</div>
<div class="btn btn-primary">Publicar aviso</div></div></div>
<div class="row gap20 mt24" style="align-items:flex-start">{esq}{dir_}</div></div>"""
    return web(topbar("Meus avisos", "Docente") + corpo, "Meus avisos", NAV_DOC, DOC)


# ---------------------------------------------------------------- 16 sem permissão
def sem_permissao():
    corpo = f"""<div class="content" style="display:flex;align-items:center;justify-content:center">
<div style="width:460px;text-align:center">
<div style="width:64px;height:64px;border-radius:18px;background:#fff;border:1px solid #E4E9F2;
display:flex;align-items:center;justify-content:center;margin:0 auto">
{ic('cadeado',28,'#5B6B86',1.5)}</div>
<div class="h1 mt20" style="font-size:22px">Esta área é da administração</div>
<div class="sub mt8">Seu perfil de docente não gerencia usuários nem perfis de acesso. Se você
precisa desse acesso, fale com a administração do CONECTA.</div>
<div class="row gap10 mt20" style="justify-content:center">
<div class="btn btn-ghost btn-sm">Voltar ao painel</div>
<div class="btn btn-primary btn-sm">Ver minhas turmas</div></div></div></div>"""
    return web(topbar("Usuários", "Docente") + corpo, "Painel", NAV_DOC, DOC)


def SCREENS():
    return [
        ("w-01-login", login()),
        ("w-02-painel-coordenacao", painel()),
        ("w-03-avisos-lista", avisos_lista()),
        ("w-04-aviso-editor", aviso_editor()),
        ("w-05-aviso-destinos", aviso_destinos()),
        ("w-06-aviso-historico", aviso_historico()),
        ("w-07-turmas", turmas()),
        ("w-08-turma-detalhe", turma_detalhe()),
        ("w-09-solicitacoes", solicitacoes()),
        ("w-10-usuarios", usuarios()),
        ("w-11-alterar-perfil", alterar_perfil()),
        ("w-12-agenda", agenda()),
        ("w-13-horarios", horarios()),
        ("w-14-painel-docente", painel_docente()),
        ("w-15-aviso-editor-docente", aviso_editor_docente()),
        ("w-16-sem-permissao", sem_permissao()),
    ]
