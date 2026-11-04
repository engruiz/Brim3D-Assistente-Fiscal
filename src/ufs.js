// Endereços dos web services da NF-e (modelo 55, layout 4.00) de cada autorizador.
// Fonte: tabela pública de web services do projeto sped-nfe (nfephp-org), conferida com o Portal Nacional da NF-e.
// Cada UF usa o seu autorizador próprio ou a SEFAZ Virtual (SVRS / SVAN).

/** UF do emitente -> autorizador. */
export const AUTORIZADOR = {
  "AC": "SVRS",
  "AL": "SVRS",
  "AM": "AM",
  "AP": "SVRS",
  "BA": "BA",
  "CE": "SVRS",
  "DF": "SVRS",
  "ES": "SVRS",
  "GO": "GO",
  "MA": "SVAN",
  "MG": "MG",
  "MS": "MS",
  "MT": "MT",
  "PA": "SVRS",
  "PB": "SVRS",
  "PE": "PE",
  "PI": "SVRS",
  "PR": "PR",
  "RJ": "SVRS",
  "RN": "SVRS",
  "RO": "SVRS",
  "RR": "SVRS",
  "RS": "RS",
  "SC": "SVRS",
  "SE": "SVRS",
  "SP": "SP",
  "TO": "SVRS"
};

/** autorizador -> ambiente -> serviço -> [url, método SOAP]. */
export const WS = {
 "AM": {
  "producao": {
   "status": [
    "https://nfe.sefaz.am.gov.br/services2/services/NfeStatusServico4",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://nfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://nfe.sefaz.am.gov.br/services2/services/NfeRetAutorizacao4",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://nfe.sefaz.am.gov.br/services2/services/NfeConsulta4",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://nfe.sefaz.am.gov.br/services2/services/NfeInutilizacao4",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://nfe.sefaz.am.gov.br/services2/services/RecepcaoEvento4",
    "nfeRecepcaoEvento"
   ]
  },
  "homologacao": {
   "status": [
    "https://homnfe.sefaz.am.gov.br/services2/services/NfeStatusServico4",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://homnfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://homnfe.sefaz.am.gov.br/services2/services/NfeRetAutorizacao4",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://homnfe.sefaz.am.gov.br/services2/services/NfeConsulta4",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://homnfe.sefaz.am.gov.br/services2/services/NfeInutilizacao4",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://homnfe.sefaz.am.gov.br/services2/services/RecepcaoEvento4",
    "nfeRecepcaoEvento"
   ]
  }
 },
 "BA": {
  "producao": {
   "status": [
    "https://nfe.sefaz.ba.gov.br/webservices/NFeStatusServico4/NFeStatusServico4.asmx",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://nfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://nfe.sefaz.ba.gov.br/webservices/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://nfe.sefaz.ba.gov.br/webservices/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://nfe.sefaz.ba.gov.br/webservices/NFeInutilizacao4/NFeInutilizacao4.asmx",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://nfe.sefaz.ba.gov.br/webservices/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
    "nfeRecepcaoEvento"
   ]
  },
  "homologacao": {
   "status": [
    "https://hnfe.sefaz.ba.gov.br/webservices/NFeStatusServico4/NFeStatusServico4.asmx",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://hnfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://hnfe.sefaz.ba.gov.br/webservices/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://hnfe.sefaz.ba.gov.br/webservices/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://hnfe.sefaz.ba.gov.br/webservices/NFeInutilizacao4/NFeInutilizacao4.asmx",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://hnfe.sefaz.ba.gov.br/webservices/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
    "nfeRecepcaoEvento"
   ]
  }
 },
 "GO": {
  "producao": {
   "status": [
    "https://nfe.sefaz.go.gov.br/nfe/services/NFeStatusServico4",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://nfe.sefaz.go.gov.br/nfe/services/NFeAutorizacao4",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://nfe.sefaz.go.gov.br/nfe/services/NFeRetAutorizacao4",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://nfe.sefaz.go.gov.br/nfe/services/NFeConsultaProtocolo4",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://nfe.sefaz.go.gov.br/nfe/services/NFeInutilizacao4",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://nfe.sefaz.go.gov.br/nfe/services/NFeRecepcaoEvento4",
    "nfeRecepcaoEvento"
   ]
  },
  "homologacao": {
   "status": [
    "https://homolog.sefaz.go.gov.br/nfe/services/NFeStatusServico4",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://homolog.sefaz.go.gov.br/nfe/services/NFeAutorizacao4",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://homolog.sefaz.go.gov.br/nfe/services/NFeRetAutorizacao4",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://homolog.sefaz.go.gov.br/nfe/services/NFeConsultaProtocolo4",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://homolog.sefaz.go.gov.br/nfe/services/NFeInutilizacao4",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://homolog.sefaz.go.gov.br/nfe/services/NFeRecepcaoEvento4",
    "nfeRecepcaoEvento"
   ]
  }
 },
 "MG": {
  "producao": {
   "status": [
    "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeInutilizacao4",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4",
    "nfeRecepcaoEvento"
   ]
  },
  "homologacao": {
   "status": [
    "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeInutilizacao4",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4",
    "nfeRecepcaoEvento"
   ]
  }
 },
 "MS": {
  "producao": {
   "status": [
    "https://nfe.sefaz.ms.gov.br/ws/NFeStatusServico4",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://nfe.sefaz.ms.gov.br/ws/NFeAutorizacao4",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://nfe.sefaz.ms.gov.br/ws/NFeRetAutorizacao4",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://nfe.sefaz.ms.gov.br/ws/NFeConsultaProtocolo4",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://nfe.sefaz.ms.gov.br/ws/NFeInutilizacao4",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://nfe.sefaz.ms.gov.br/ws/NFeRecepcaoEvento4",
    "nfeRecepcaoEvento"
   ]
  },
  "homologacao": {
   "status": [
    "https://hom.nfe.sefaz.ms.gov.br/ws/NFeStatusServico4",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://hom.nfe.sefaz.ms.gov.br/ws/NFeAutorizacao4",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://hom.nfe.sefaz.ms.gov.br/ws/NFeRetAutorizacao4",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://hom.nfe.sefaz.ms.gov.br/ws/NFeConsultaProtocolo4",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://hom.nfe.sefaz.ms.gov.br/ws/NFeInutilizacao4",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://hom.nfe.sefaz.ms.gov.br/ws/NFeRecepcaoEvento4",
    "nfeRecepcaoEvento"
   ]
  }
 },
 "MT": {
  "producao": {
   "status": [
    "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeStatusServico4",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeRetAutorizacao4",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeConsulta4",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeInutilizacao4",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://nfe.sefaz.mt.gov.br/nfews/v2/services/RecepcaoEvento4",
    "nfeRecepcaoEvento"
   ]
  },
  "homologacao": {
   "status": [
    "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeStatusServico4",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeRetAutorizacao4",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeConsulta4",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeInutilizacao4",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/RecepcaoEvento4",
    "nfeRecepcaoEvento"
   ]
  }
 },
 "PE": {
  "producao": {
   "status": [
    "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeStatusServico4",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeRetAutorizacao4",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeConsultaProtocolo4",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeInutilizacao4",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeRecepcaoEvento4",
    "nfeRecepcaoEvento"
   ]
  },
  "homologacao": {
   "status": [
    "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeStatusServico4",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeRetAutorizacao4",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeConsultaProtocolo4",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeInutilizacao4",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeRecepcaoEvento4",
    "nfeRecepcaoEvento"
   ]
  }
 },
 "PR": {
  "producao": {
   "status": [
    "https://nfe.sefa.pr.gov.br/nfe/NFeStatusServico4",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://nfe.sefa.pr.gov.br/nfe/NFeRetAutorizacao4",
    "nfeRetAutorizacao"
   ],
   "consulta": [
    "https://nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://nfe.sefa.pr.gov.br/nfe/NFeInutilizacao4",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4",
    "nfeRecepcaoEvento"
   ]
  },
  "homologacao": {
   "status": [
    "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeStatusServico4",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRetAutorizacao4",
    "nfeRetAutorizacao"
   ],
   "consulta": [
    "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeInutilizacao4",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4",
    "nfeRecepcaoEvento"
   ]
  }
 },
 "RS": {
  "producao": {
   "status": [
    "https://nfe.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://nfe.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://nfe.sefazrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://nfe.sefazrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://nfe.sefazrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://nfe.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    "nfeRecepcaoEvento"
   ]
  },
  "homologacao": {
   "status": [
    "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://nfe-homologacao.sefazrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://nfe-homologacao.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    "nfeRecepcaoEvento"
   ]
  }
 },
 "SP": {
  "producao": {
   "status": [
    "https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx",
    "nfeRecepcaoEvento"
   ]
  },
  "homologacao": {
   "status": [
    "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx",
    "nfeRecepcaoEvento"
   ]
  }
 },
 "SVAN": {
  "producao": {
   "status": [
    "https://www.sefazvirtual.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://www.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://www.sefazvirtual.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://www.sefazvirtual.fazenda.gov.br/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://www.sefazvirtual.fazenda.gov.br/NFeInutilizacao4/NFeInutilizacao4.asmx",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://www.sefazvirtual.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
    "nfeRecepcaoEvento"
   ]
  },
  "homologacao": {
   "status": [
    "https://hom.sefazvirtual.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://hom.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://hom.sefazvirtual.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://hom.sefazvirtual.fazenda.gov.br/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://hom.sefazvirtual.fazenda.gov.br/NFeInutilizacao4/NFeInutilizacao4.asmx",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://hom.sefazvirtual.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
    "nfeRecepcaoEvento"
   ]
  }
 },
 "SVRS": {
  "producao": {
   "status": [
    "https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://nfe.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    "nfeRecepcaoEvento"
   ]
  },
  "homologacao": {
   "status": [
    "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
    "nfeStatusServicoNF"
   ],
   "autorizacao": [
    "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
    "nfeAutorizacaoLote"
   ],
   "retAutorizacao": [
    "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
    "nfeRetAutorizacaoLote"
   ],
   "consulta": [
    "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
    "nfeConsultaNF"
   ],
   "inutilizacao": [
    "https://nfe-homologacao.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
    "nfeInutilizacaoNF"
   ],
   "evento": [
    "https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    "nfeRecepcaoEvento"
   ]
  }
 }
};

export function wsDe(uf, ambiente, servico) {
  const aut = AUTORIZADOR[String(uf || "").toUpperCase()];
  if (!aut) throw new Error(`UF "${uf}" sem autorizador de NF-e conhecido.`);
  const w = WS[aut]?.[ambiente === "producao" ? "producao" : "homologacao"]?.[servico];
  if (!w) throw new Error(`Serviço ${servico} indisponível para ${uf}.`);
  return { url: w[0], metodo: w[1], autorizador: aut };
}
