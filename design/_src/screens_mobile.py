"""Telas do aplicativo mobile (todos os perfis; o aluno é o caso base)."""
from shell import mobile, appbar, ic, logo, mark

CURSO = "Tecnologia em Sistemas para Internet"


# ---------------------------------------------------------------- peças
def chip(texto, tipo="turma"):
    return f'<span class="chip t-{tipo}"><span class="dot"></span>{texto}</span>'


def aviso_item(titulo, autor, papel, quando, trecho, chips, editado=False, ini="CO"):
    ed = '<span class="meta" style="color:#8A99B0"> · editado</span>' if editado else ""
    return f"""<div style="padding:16px 20px;border-bottom:1px solid #EFF2F7">
<div class="row center gap10">
<div class="avatar sm">{ini}</div>
<div class="col"><span style="font-size:12.5px;font-weight:600;color:#2A4374">{autor}</span>
<span class="meta">{papel}</span></div>
<div class="grow"></div><span class="meta">{quando}{ed}</span></div>
<div class="h3 mt10" style="font-size:15px;line-height:1.35">{titulo}</div>
<div class="sub mt6" style="color:#5B6B86">{trecho}</div>
<div class="chips mt10">{chips}</div></div>"""


def seg(ativo, outro):
    return f"""<div class="row gap8" style="padding:0 20px 14px">
<div style="height:32px;padding:0 14px;border-radius:999px;background:#132A4E;color:#fff;
font-size:12.5px;font-weight:600;display:flex;align-items:center">{ativo}</div>
<div style="height:32px;padding:0 14px;border-radius:999px;border:1px solid #E4E9F2;color:#5B6B86;
font-size:12.5px;font-weight:550;display:flex;align-items:center">{outro}</div></div>"""


# ---------------------------------------------------------------- 01 login
def login():
    body = f"""<div class="screen" style="padding:56px 28px 0;display:flex;flex-direction:column">
<div>{mark(44)}</div>
<div class="h1 mt20" style="font-size:30px;letter-spacing:.08em;font-weight:800">CONECTA</div>
<div class="sub mt8" style="max-width:270px">Avisos, agenda e turmas do curso de {CURSO} — IFSul.</div>

<div class="mt32">
<label class="field"><span class="lbl">Usuário</span>
<div class="input ph">{ic('perfil',18,'#8A99B0')} seu.usuario</div></label>
<label class="field mt16"><span class="lbl">Senha</span>
<div class="input focus">{ic('cadeado',18,'#2563EB')}
<span style="letter-spacing:.22em;color:#0F1C33">••••••••••</span></div></label>
<div class="btn btn-primary btn-block mt24">Entrar</div>
</div>

<div class="grow"></div>
<div class="row gap10" style="padding:18px 16px;background:#F5F8FC;border-radius:12px;margin-bottom:30px">
{ic('escudo',18,'#2A4374')}
<div class="sub" style="font-size:12.5px;color:#2A4374">Suas credenciais são validadas pelo Moodle
do IFSul. O CONECTA não armazena sua senha.</div></div></div>"""
    return mobile(body, bare=True)


# ---------------------------------------------------------------- 02 avisos
def avisos():
    itens = (
        aviso_item("Matrícula do 2º semestre: prazos e orientações", "Coordenação do curso",
                   "Marina Duarte", "há 2 h",
                   "A matrícula ocorre de 14 a 21 de outubro pelo portal do aluno. Quem tiver "
                   "pendência de disciplina deve procurar a coordenação antes.",
                   chip("Todos", "todos"), ini="CO") +
        aviso_item("Defesas de TCC II — bancas de 24 de outubro", "Coordenação do curso",
                   "Marina Duarte", "ontem",
                   "Lista de horários e salas das cinco defesas. Presença obrigatória para os "
                   "orientandos.",
                   chip("6º semestre", "semestre") + chip("Docentes", "docentes"), ini="CO") +
        aviso_item("Entrega do trabalho de Redes adiada para 30/10", "Ricardo Lemos",
                   "Docente", "seg, 09:12",
                   "O prazo foi estendido em uma semana. O formulário de envio continua o mesmo.",
                   chip("SI-3A"), editado=True, ini="RL") +
        aviso_item("Sala alterada: Banco de Dados II agora no Lab 4", "Helena Prado",
                   "Docente", "seg, 08:40",
                   "A partir desta semana as aulas de quarta acontecem no laboratório 4.",
                   chip("SI-3A") + chip("SI-3B"), ini="HP")
    )
    body = (appbar("Avisos",
                   right=ic('busca', 21, '#2A4374') + ic('sino', 21, '#2A4374'),
                   bordered=False) + seg("Ativos", "Arquivados") +
            f'<div class="screen" style="border-top:1px solid #EFF2F7">{itens}</div>')
    return mobile(body, tab="avisos")


# ---------------------------------------------------------------- 03 detalhe
def aviso_detalhe():
    body = (appbar("", left=ic('voltar', 21, '#2A4374'),
                   right=ic('arquivo', 20, '#2A4374'), bordered=False) + """
<div class="screen" style="padding:4px 20px 0;overflow:hidden">
<div class="chips">""" + chip("SI-3A") + """</div>
<div class="h1 mt12" style="font-size:22px">Entrega do trabalho de Redes adiada para 30/10</div>
<div class="row center gap10 mt16">
<div class="avatar">RL</div>
<div class="col"><span style="font-size:13px;font-weight:600;color:#132A4E">Ricardo Lemos</span>
<span class="meta">Docente · Redes de Computadores</span></div></div>
<div class="rule mt16"></div>
<div class="body mt16" style="color:#263A5B">O prazo de entrega do trabalho prático de Redes foi
estendido para <b>30 de outubro, às 23h59</b>. O formulário de envio continua o mesmo e aceita
apenas um arquivo por grupo.<br><br>Quem já enviou pode substituir o arquivo até a nova data.
A apresentação dos grupos segue marcada para 4 de novembro, em aula.</div>
<div class="row gap6 mt20" style="padding:11px 13px;background:#F5F8FC;border-radius:10px">
""" + ic('historico', 16, '#8A99B0') + """
<span class="meta">Publicado seg, 09:12 · editado seg, 14:05</span></div></div>""")
    return mobile(body, tab="avisos")


# ---------------------------------------------------------------- 04 arquivados
def avisos_arquivados():
    itens = (
        aviso_item("Resultado da seleção de monitoria 2026/2", "Coordenação do curso",
                   "Marina Duarte", "12 set",
                   "Monitores selecionados por disciplina e datas de início das atividades.",
                   chip("Todos", "todos"), ini="CO") +
        aviso_item("Prova de Estrutura de Dados remarcada", "Helena Prado", "Docente", "3 set",
                   "A avaliação passou para 10 de setembro, mesmo horário.",
                   chip("SI-3A"), ini="HP")
    )
    body = (appbar("Avisos", right=ic('busca', 21, '#2A4374') + ic('sino', 21, '#2A4374'),
                   bordered=False) +
            """<div class="row gap8" style="padding:0 20px 14px">
<div style="height:32px;padding:0 14px;border-radius:999px;border:1px solid #E4E9F2;color:#5B6B86;
font-size:12.5px;font-weight:550;display:flex;align-items:center">Ativos</div>
<div style="height:32px;padding:0 14px;border-radius:999px;background:#132A4E;color:#fff;
font-size:12.5px;font-weight:600;display:flex;align-items:center">Arquivados</div></div>""" +
            f"""<div class="screen" style="border-top:1px solid #EFF2F7">
<div class="row gap8 center" style="padding:12px 20px;background:#F5F8FC">
{ic('info',16,'#5B6B86')}<span class="meta" style="color:#5B6B86">
Avisos arquivados saem da lista ativa e ficam guardados aqui.</span></div>{itens}</div>""")
    return mobile(body, tab="avisos")


# ---------------------------------------------------------------- 05 vazio
def avisos_vazio():
    body = (appbar("Avisos", right=ic('busca', 21, '#2A4374') + ic('sino', 21, '#2A4374'),
                   bordered=False) + seg("Ativos", "Arquivados") + f"""
<div class="screen tinted" style="display:flex;flex-direction:column;align-items:center;
justify-content:center;padding:0 48px;text-align:center">
<div style="width:72px;height:72px;border-radius:22px;background:#fff;border:1px solid #E4E9F2;
display:flex;align-items:center;justify-content:center">{ic('inbox',30,'#8A99B0',1.5)}</div>
<div class="h3 mt20">Nenhum aviso por enquanto</div>
<div class="sub mt8">Você verá aqui os avisos gerais do curso e os das turmas em que estiver
inscrito.</div>
<div class="btn btn-ghost btn-sm mt20">Ver turmas disponíveis</div></div>""")
    return mobile(body, tab="avisos")


# ---------------------------------------------------------------- 06 minhas turmas
def minhas_turmas():
    def turma(cod, nome, papel, semestre, docentes, cor="#2563EB"):
        return f"""<div class="card pad16 mt12">
<div class="row between center">
<div class="row center gap10">
<div style="width:38px;height:38px;border-radius:10px;background:#EFF4FF;color:#1D4ED8;
font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center">{cod}</div>
<div class="col"><span class="h3" style="font-size:14.5px">{nome}</span>
<span class="meta mt4">{semestre} · {docentes}</span></div></div>
<span class="badge b-blue">{papel}</span></div></div>"""
    body = (appbar("Minhas turmas", sub="Você está vinculado a 3 turmas em 2026/2",
                   bordered=False) + f"""
<div class="screen tinted" style="padding:14px 20px 0">
{turma("SI<br>3A","Sistemas para Internet 3A","Aluno","3º semestre","4 docentes")}
{turma("SI<br>3B","Sistemas para Internet 3B","Aluno","3º semestre","3 docentes")}
{turma("OPT<br>1","Tópicos em Computação em Nuvem","Aluno","Optativa · 2026/2","Ricardo Lemos")}
<div class="card pad16 mt20">
<div class="row between center">
<div class="col gap4" style="max-width:215px">
<span class="h3" style="font-size:14px">Entrar em outra turma</span>
<span class="meta" style="line-height:1.45">A inscrição passa pela aprovação da coordenação ou
do docente.</span></div>
<div class="btn btn-ghost btn-sm">Ver turmas</div></div></div>

<div class="row between center mt24">
<div class="sec-title">Minhas solicitações</div>
<span style="font-size:13px;font-weight:600;color:#2563EB">Ver todas</span></div>

<div class="card pad16 mt10">
<div class="row between center">
<div class="col gap4"><span style="font-size:13.5px;font-weight:600;color:#132A4E">
Introdução a Ciência de Dados</span><span class="meta">Enviada em 10 out</span></div>
<span class="badge b-pend">Pendente</span></div></div>

<div class="card pad16 mt10">
<div class="row between center">
<div class="col gap4"><span style="font-size:13.5px;font-weight:600;color:#132A4E">
Desenvolvimento de Jogos</span><span class="meta">Recusada em 30 ago</span></div>
<span class="badge b-exc">Recusada</span></div></div>
</div>""")
    return mobile(body, tab="turmas")


# ---------------------------------------------------------------- 07 turmas disponíveis
def turmas_disponiveis():
    def item(cod, nome, semestre, info, estado=None):
        acao = (f'<span class="badge b-pend">{estado}</span>' if estado
                else '<div class="btn btn-primary btn-sm">Solicitar</div>')
        return f"""<div class="card pad16 mt12">
<div class="row between center">
<div class="col gap4"><span class="h3" style="font-size:14.5px">{nome}</span>
<span class="meta">{cod} · {semestre} · {info}</span></div>{acao}</div></div>"""
    body = (appbar("Turmas disponíveis", left=ic('voltar', 21, '#2A4374'),
                   sub="Turmas ativas com inscrições abertas", bordered=False) + f"""
<div class="screen tinted" style="padding:14px 20px 0">
{item("SI-4A","Sistemas para Internet 4A","4º semestre","Inscrições abertas")}
{item("OPT-2","Introdução a Ciência de Dados","Optativa","Inscrições abertas","Solicitada")}
{item("SI-5A","Sistemas para Internet 5A","5º semestre","Inscrições abertas")}
{item("OPT-3","Desenvolvimento de Jogos","Optativa","Inscrições abertas")}
<div class="row gap8 mt20" style="padding:12px 14px;background:#fff;border:1px solid #E4E9F2;
border-radius:10px">{ic('info',16,'#5B6B86')}
<span class="meta" style="color:#5B6B86">Turmas em que você já está inscrito ou com solicitação
pendente não aparecem nesta lista.</span></div></div>""")
    return mobile(body, tab="turmas")


# ---------------------------------------------------------------- 08 solicitação enviada
def solicitacao_enviada():
    base = (appbar("Turmas disponíveis", left=ic('voltar', 21, '#2A4374'),
                   sub="Turmas ativas com inscrições abertas", bordered=False) +
            '<div class="screen tinted" style="padding:14px 20px 0;filter:blur(1.5px);opacity:.5">'
            '<div class="card pad16" style="height:74px"></div>'
            '<div class="card pad16 mt12" style="height:74px"></div>'
            '<div class="card pad16 mt12" style="height:74px"></div></div>')
    sheet = f"""<div style="position:absolute;inset:0;background:rgba(15,28,51,.38)"></div>
<div style="position:absolute;left:0;right:0;bottom:0;background:#fff;border-radius:22px 22px 0 0;
padding:10px 24px 34px">
<div style="width:38px;height:4px;border-radius:2px;background:#E4E9F2;margin:0 auto 20px"></div>
<div style="width:48px;height:48px;border-radius:14px;background:#E9F6EE;display:flex;
align-items:center;justify-content:center">{ic('check',24,'#15803D',2)}</div>
<div class="h2 mt16">Solicitação enviada</div>
<div class="sub mt8">Sua inscrição em <b style="color:#132A4E">Introdução a Ciência de Dados</b>
ficou pendente. A coordenação ou o docente da turma decide — você é avisado aqui quando houver
resposta.</div>
<div class="btn btn-navy btn-block mt20">Ver minhas solicitações</div>
<div class="btn btn-quiet btn-block mt8" style="height:38px">Voltar às turmas</div></div>"""
    return mobile(base + sheet, tab="turmas")


# ---------------------------------------------------------------- 09 minhas solicitações
def minhas_solicitacoes():
    def item(nome, data, estado, classe, extra=None, acao=None):
        extra_html = f'<div class="sub mt8" style="font-size:12.5px">{extra}</div>' if extra else ""
        acao_html = (f'<div class="row mt12"><div class="btn btn-danger btn-sm">{acao}</div></div>'
                     if acao else "")
        return f"""<div class="card pad16 mt12">
<div class="row between center">
<div class="col gap4"><span class="h3" style="font-size:14.5px">{nome}</span>
<span class="meta">Enviada em {data}</span></div>
<span class="badge {classe}">{estado}</span></div>{extra_html}{acao_html}</div>"""
    body = (appbar("Minhas solicitações", left=ic('voltar', 21, '#2A4374'), bordered=False) + f"""
<div class="screen tinted" style="padding:14px 20px 0">
{item("Introdução a Ciência de Dados","10 out","Pendente","b-pend",acao="Cancelar solicitação")}
{item("Sistemas para Internet 3B","2 set","Aprovada","b-ativo",
      "Aprovada por Marina Duarte em 3 set · vínculo criado")}
{item("Desenvolvimento de Jogos","28 ago","Recusada","b-exc",
      "Motivo: turma sem vagas para alunos de outro semestre.")}
</div>""")
    return mobile(body, tab="turmas")


# ---------------------------------------------------------------- 10 agenda
def agenda():
    def ev(dia, mes, titulo, tipo, hora, local, chips, cor="#2563EB"):
        return f"""<div class="row gap14" style="padding:16px 20px;border-bottom:1px solid #EFF2F7;align-items:stretch">
<div class="col center" style="width:46px;flex:0 0 46px;padding-top:2px">
<span style="font-size:19px;font-weight:700;color:#132A4E;letter-spacing:-.02em">{dia}</span>
<span class="meta" style="font-size:11px">{mes}</span></div>
<div style="width:2px;background:{cor};border-radius:1px;opacity:.55"></div>
<div class="col grow gap6">
<span class="meta" style="color:{cor};font-weight:650">{tipo}</span>
<span class="h3" style="font-size:14.5px;line-height:1.3">{titulo}</span>
<div class="row gap12 mt4">
<span class="meta row gap4 center">{ic('relogio',13,'#8A99B0')} {hora}</span>
<span class="meta row gap4 center">{ic('local',13,'#8A99B0')} {local}</span></div>
<div class="chips mt6">{chips}</div></div></div>"""
    body = (appbar("Agenda", right=ic('filtro', 20, '#2A4374'), bordered=False) +
            """<div class="row gap8" style="padding:0 20px 14px">
<div style="height:32px;padding:0 14px;border-radius:999px;background:#132A4E;color:#fff;
font-size:12.5px;font-weight:600;display:flex;align-items:center">Próximos</div>
<div style="height:32px;padding:0 14px;border-radius:999px;border:1px solid #E4E9F2;color:#5B6B86;
font-size:12.5px;font-weight:550;display:flex;align-items:center">Provas</div>
<div style="height:32px;padding:0 14px;border-radius:999px;border:1px solid #E4E9F2;color:#5B6B86;
font-size:12.5px;font-weight:550;display:flex;align-items:center">Mês</div></div>""" +
            f"""<div class="screen" style="border-top:1px solid #EFF2F7">
{ev("16","out","Prova de Banco de Dados II","Prova","19:10 – 20:50","Lab 4",chip("SI-3A"),"#B45309")}
{ev("21","out","Palestra: carreira em infraestrutura em nuvem","Palestra","19:00 – 21:00",
    "Auditório",chip("Todos","todos"))}
{ev("24","out","Defesas de TCC II","Banca","14:00 – 18:00","Sala 203",
    chip("6º semestre","semestre")+chip("Docentes","docentes"))}
{ev("31","out","Prazo final: trabalho de Redes","Data importante","até 23:59","Entrega on-line",
    chip("SI-3A"),"#2A4374")}
{ev("04","nov","Semana Acadêmica 2026/2","Evento","08:00 – 22:00","Câmpus",
    chip("Todos","todos"))}</div>""")
    return mobile(body, tab="agenda")


# ---------------------------------------------------------------- 10b agenda (mês)
def agenda_mes():
    """Visualização mensal: grade do mês com marcadores e a lista do dia escolhido."""
    # outubro de 2026 começa numa quinta-feira; a semana abre no domingo
    pontos = {9: ["#2563EB"], 13: ["#2563EB"], 16: ["#B45309"], 21: ["#2563EB"],
              24: ["#2563EB", "#2A4374"], 28: ["#2563EB"], 31: ["#2A4374"]}
    semanas = [[("27", False), ("28", False), ("29", False), ("30", False),
                (1, True), (2, True), (3, True)],
               [(d, True) for d in range(4, 11)],
               [(d, True) for d in range(11, 18)],
               [(d, True) for d in range(18, 25)],
               [(d, True) for d in range(25, 32)]]
    hoje, escolhido = 13, 16

    linhas = ""
    for semana in semanas:
        celulas = ""
        for dia, do_mes in semana:
            cor = "#132A4E" if do_mes else "#C3CCDA"
            peso = "550"
            fundo = ""
            if do_mes and dia == escolhido:
                fundo = ("background:#132A4E;border-radius:50%;width:34px;height:34px;"
                         "display:flex;align-items:center;justify-content:center;margin:0 auto")
                cor, peso = "#fff", "700"
            elif do_mes and dia == hoje:
                cor, peso = "#2563EB", "700"
            marcas = ""
            if do_mes and dia in pontos:
                bolas = "".join(f'<span style="width:5px;height:5px;border-radius:50%;'
                                f'background:{c}"></span>' for c in pontos[dia])
                marcas = f'<div class="row gap4" style="justify-content:center;height:5px">{bolas}</div>'
            else:
                marcas = '<div style="height:5px"></div>'
            celulas += f"""<div class="col" style="flex:1;gap:4px;padding:2px 0">
<div style="{fundo or 'height:34px;display:flex;align-items:center;justify-content:center'}">
<span style="font-size:15px;font-weight:{peso};color:{cor};letter-spacing:-.01em">{dia}</span>
</div>{marcas}</div>"""
        linhas += f'<div class="row">{celulas}</div>'

    cabecalho = "".join(
        f'<div style="flex:1;text-align:center;font-size:11px;font-weight:600;color:#8A99B0">{d}</div>'
        for d in ["D", "S", "T", "Q", "Q", "S", "S"])

    def item(hora, titulo, tipo, local, chips, cor="#2563EB"):
        return f"""<div class="row gap12" style="padding:13px 20px;border-bottom:1px solid #EFF2F7;
align-items:stretch">
<div class="col" style="width:52px;flex:0 0 52px;gap:3px;padding-top:2px">
<span style="font-size:13px;font-weight:650;color:#132A4E">{hora}</span>
<span class="meta" style="font-size:11px">{tipo}</span></div>
<div style="width:2px;background:{cor};border-radius:1px;opacity:.55"></div>
<div class="col grow gap4">
<span class="h3" style="font-size:14px;line-height:1.3">{titulo}</span>
<span class="meta row center gap4">{ic('local',13,'#8A99B0')} {local}</span>
<div class="chips mt6">{chips}</div></div></div>"""

    body = (appbar("Agenda", right=ic('filtro', 20, '#2A4374'), bordered=False) +
            """<div class="row gap8" style="padding:0 20px 12px">
<div style="height:32px;padding:0 14px;border-radius:999px;border:1px solid #E4E9F2;color:#5B6B86;
font-size:12.5px;font-weight:550;display:flex;align-items:center">Próximos</div>
<div style="height:32px;padding:0 14px;border-radius:999px;border:1px solid #E4E9F2;color:#5B6B86;
font-size:12.5px;font-weight:550;display:flex;align-items:center">Provas</div>
<div style="height:32px;padding:0 14px;border-radius:999px;background:#132A4E;color:#fff;
font-size:12.5px;font-weight:600;display:flex;align-items:center">Mês</div></div>""" +
            f"""<div class="screen" style="border-top:1px solid #EFF2F7">

<div class="row between center" style="padding:14px 20px 8px">
<div class="h2" style="font-size:17px">Outubro de 2026</div>
<div class="row center gap18" style="gap:22px">
<div style="transform:rotate(0deg)">{ic('voltar',18,'#2563EB')}</div>
<div style="transform:rotate(180deg)">{ic('voltar',18,'#2563EB')}</div></div></div>

<div class="row" style="padding:0 12px 4px">{cabecalho}</div>
<div style="padding:0 12px">{linhas}</div>

<div style="height:8px;background:#F5F8FC;border-top:1px solid #EFF2F7;
border-bottom:1px solid #EFF2F7;margin-top:12px"></div>

<div class="row between center" style="padding:14px 20px 10px">
<span class="h3" style="font-size:14px">Sexta, 16 de outubro</span>
<span class="meta">2 atividades</span></div>

{item("19:10","Prova de Banco de Dados II","Prova","Lab 4",chip("SI-3A"),"#B45309")}
{item("23:59","Entrega da lista 5 de Redes","Prazo","Entrega on-line",
      chip("SI-3A"),"#2A4374")}
</div>""")
    return mobile(body, tab="agenda")


# ---------------------------------------------------------------- 11 evento
def evento_detalhe():
    body = (appbar("", left=ic('voltar', 21, '#2A4374'), bordered=False) + f"""
<div class="screen" style="padding:4px 20px 0">
<span class="badge b-pend">Palestra</span>
<div class="h1 mt12" style="font-size:22px">Carreira em infraestrutura em nuvem</div>
<div class="card mt16" style="padding:4px 16px">
<div class="row center gap12" style="padding:13px 0;border-bottom:1px solid #EFF2F7">
{ic('agenda',18,'#2563EB')}<div class="col"><span class="body" style="font-weight:600">
Terça, 21 de outubro</span><span class="meta">19:00 – 21:00</span></div></div>
<div class="row center gap12" style="padding:13px 0">
{ic('local',18,'#2563EB')}<div class="col"><span class="body" style="font-weight:600">
Auditório do câmpus</span><span class="meta">Prédio B, térreo</span></div></div></div>
<div class="body mt20" style="color:#263A5B">Bate-papo com egressas e egressos do curso que
trabalham com provisionamento e operação de serviços em nuvem. Haverá espaço para perguntas e
emissão de certificado de 2 h.</div>
<div class="sec-title mt24">Para quem é</div>
<div class="chips mt8">{chip("Todos","todos")}</div>
<div class="row center gap10 mt24" style="padding-bottom:20px">
<div class="avatar sm">CO</div>
<div class="col"><span style="font-size:12.5px;font-weight:600;color:#2A4374">Coordenação do curso
</span><span class="meta">Publicado em 6 out</span></div></div></div>""")
    return mobile(body, tab="agenda")


# ---------------------------------------------------------------- 12 horários
def horarios():
    aulas = {
        "SEG": [("19:10", "Banco de Dados II", "Lab 4", "#2563EB"),
                ("21:00", "Engenharia de Software", "Sala 203", "#2A4374")],
        "TER": [("19:10", "Redes de Computadores", "Lab 2", "#2563EB")],
        "QUA": [("19:10", "Banco de Dados II", "Lab 4", "#2563EB"),
                ("21:00", "Interface Humano-Computador", "Sala 205", "#2A4374")],
        "QUI": [("19:10", "Programação Web", "Lab 3", "#2563EB")],
        "SEX": [("19:10", "Estatística Aplicada", "Sala 201", "#2A4374")],
    }
    linhas = ""
    for dia, lista in aulas.items():
        blocos = ""
        for hora, disc, local, cor in lista:
            blocos += f"""<div style="border-left:2px solid {cor};padding:2px 0 2px 10px;
margin-bottom:10px"><div style="font-size:13.5px;font-weight:600;color:#132A4E">{disc}</div>
<div class="meta mt4">{hora} · {local}</div></div>"""
        linhas += f"""<div class="row gap14" style="padding:14px 20px;border-bottom:1px solid #EFF2F7">
<div style="width:34px;flex:0 0 34px;font-size:11.5px;font-weight:700;color:#8A99B0;
letter-spacing:.06em;padding-top:3px">{dia}</div>
<div class="grow">{blocos}</div></div>"""
    body = (appbar("Horários", sub="Sistemas para Internet 3A · noturno", bordered=False) +
            f"""<div class="row between center" style="padding:0 20px 14px">
<div class="row center gap8" style="height:34px;padding:0 13px;border:1px solid #E4E9F2;
border-radius:9px"><span style="font-size:13px;font-weight:600;color:#132A4E">Turma SI-3A</span>
{ic('seta',14,'#8A99B0')}</div></div>
<div class="screen" style="border-top:1px solid #EFF2F7">{linhas}</div>""")
    return mobile(body, tab="horarios")


# ---------------------------------------------------------------- 13 perfil
def perfil():
    def linha(icone, rotulo, valor):
        return f"""<div class="row center gap12" style="padding:14px 0;border-bottom:1px solid #EFF2F7">
{ic(icone,18,'#5B6B86')}<span class="sub" style="color:#5B6B86">{rotulo}</span>
<div class="grow"></div><span class="body" style="font-weight:600">{valor}</span></div>"""
    body = (appbar("Perfil", bordered=False) + f"""
<div class="screen" style="padding:6px 20px 0">
<div class="row center gap16">
<div class="avatar lg">JS</div>
<div class="col gap4"><span class="h2">Júlia Santos</span>
<span class="sub">julia.santos</span>
<span class="badge b-blue mt6" style="width:fit-content">Aluno</span></div></div>

<div class="card mt24" style="padding:2px 16px">
{linha('livro','Curso','Sistemas para Internet')}
{linha('agenda','Período letivo','2026/2')}
<div class="row center gap12" style="padding:14px 0">
{ic('turmas',18,'#5B6B86')}<span class="sub" style="color:#5B6B86">Turmas</span>
<div class="grow"></div><span class="body" style="font-weight:600">3 vínculos</span></div></div>

<div class="sec-title mt24">Minhas turmas</div>
<div class="chips mt10">{chip("SI-3A")}{chip("SI-3B")}{chip("OPT-1")}</div>

<div class="row center gap10 mt24" style="padding:14px 16px;background:#F5F8FC;border-radius:10px">
{ic('escudo',18,'#2A4374')}<span class="meta" style="color:#2A4374">Seu perfil de acesso é
definido pela administração do CONECTA.</span></div>

<div class="row center gap10 mt20">{ic('sair',18,'#B91C1C')}
<span style="font-size:14px;font-weight:600;color:#B91C1C">Sair da conta</span></div></div>""")
    return mobile(body, tab="perfil")


def SCREENS():
    return [
        ("m-01-login", login()),
        ("m-02-avisos", avisos()),
        ("m-03-aviso-detalhe", aviso_detalhe()),
        ("m-04-avisos-arquivados", avisos_arquivados()),
        ("m-05-avisos-vazio", avisos_vazio()),
        ("m-06-minhas-turmas", minhas_turmas()),
        ("m-07-turmas-disponiveis", turmas_disponiveis()),
        ("m-08-solicitacao-enviada", solicitacao_enviada()),
        ("m-09-minhas-solicitacoes", minhas_solicitacoes()),
        ("m-10-agenda", agenda()),
        ("m-10b-agenda-mes", agenda_mes()),
        ("m-11-evento-detalhe", evento_detalhe()),
        ("m-12-horarios", horarios()),
        ("m-13-perfil", perfil()),
    ]
