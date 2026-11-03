// Descoberta de impressoras na rede local.
import dgram from "node:dgram";
import os from "node:os";
import tls from "node:tls";
import { identificarMoonraker } from "./moonraker.js";

const MODELOS_BAMBU = { "BL-P001": "X1 Carbon", "BL-P002": "X1", C13: "X1E", C11: "P1P", C12: "P1S", N1: "A1 Mini", N2S: "A1", O1D: "H2D", O1S: "H2S", O1E: "H2D Pro" };

// Bambu Lab: as impressoras anunciam-se por SSDP (UDP 1990).
export function descobrirBambu(ms = 6000) {
  return new Promise((resolve) => {
    const achadas = new Map();
    const sock = dgram.createSocket({ type: "udp4", reuseAddr: true });
    const fim = () => { try { sock.close(); } catch { /* ok */ } resolve([...achadas.values()]); };
    sock.on("error", fim);
    sock.on("message", (msg, rinfo) => {
      const t = msg.toString();
      if (!/bambu/i.test(t)) return;
      const h = {};
      for (const l of t.split(/\r?\n/)) { const i = l.indexOf(":"); if (i > 0) h[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim(); }
      const serial = (h.usn || "").trim();
      if (!serial) return;
      const ip = (h.location || rinfo.address).trim();
      const cod = h["devmodel.bambu.com"] || "";
      achadas.set(serial, {
        chave: serial, tipo: /cloud/i.test(h["devconnect.bambu.com"] || "") ? "bambu_nuvem" : "bambu_lan",
        ip, serial, nome: h["devname.bambu.com"] || `Bambu ${MODELOS_BAMBU[cod] || ""}`.trim(),
        modelo: `Bambulab ${MODELOS_BAMBU[cod] || cod}`.trim(),
      });
    });
    sock.bind(1990, () => {
      for (const ifc of interfacesIPv4()) { try { sock.addMembership("239.255.255.250", ifc); } catch { /* interface sem multicast */ } }
      const busca = Buffer.from("M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1990\r\nMAN: \"ssdp:discover\"\r\nMX: 3\r\nST: urn:bambulab-com:device:3dprinter:1\r\n\r\n");
      try { sock.send(busca, 1990, "239.255.255.250"); } catch { /* ok */ }
    });
    setTimeout(fim, ms);
  });
}

function interfacesIPv4() {
  const r = [];
  for (const lista of Object.values(os.networkInterfaces())) for (const a of lista || []) if (a.family === "IPv4" && !a.internal) r.push(a.address);
  return r;
}

function sub_redes() {
  const nets = [];
  for (const lista of Object.values(os.networkInterfaces())) {
    for (const a of lista || []) {
      if (a.family === "IPv4" && !a.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address)) nets.push(a.address.split(".").slice(0, 3).join("."));
    }
  }
  return [...new Set(nets)];
}

// Klipper/Moonraker: varre a sub-rede (/24) procurando a porta 7125.
export async function descobrirMoonraker(prefixos = sub_redes()) {
  const alvos = [];
  for (const p of prefixos) for (let i = 1; i < 255; i++) alvos.push(`${p}.${i}`);
  const achadas = [];
  let idx = 0;
  const trabalhador = async () => {
    while (idx < alvos.length) {
      const ip = alvos[idx++];
      try {
        const info = await identificarMoonraker(ip, 700);
        achadas.push({ chave: `moonraker:${ip}`, tipo: "moonraker", ip, serial: "", nome: info.hostname || `Klipper ${ip}`, modelo: "" });
      } catch { /* não é Moonraker */ }
    }
  };
  await Promise.all(Array.from({ length: 64 }, trabalhador));
  return achadas;
}

// Prefixo do número de série -> modelo (os mais comuns; o resto vira "Bambu Lab").
const PREFIXO_SERIAL = { "00M": "X1 Carbon", "00W": "X1", "03W": "X1E", "01S": "P1P", "01P": "P1S", "030": "A1 Mini", "039": "A1", "093": "H2S", "094": "H2D", "239": "H2D Pro" };

// Bambu Lab em QUALQUER modo (inclusive nuvem): a impressora responde na porta 8883 (MQTT/TLS) e o
// certificado dela traz o número de série no campo CN. Não precisa de senha para ler isso.
function lerSerialBambu(ip, ms = 900) {
  return new Promise((resolve) => {
    let feito = false;
    const fim = (v) => { if (!feito) { feito = true; try { sock.destroy(); } catch { /* ok */ } resolve(v); } };
    const sock = tls.connect({ host: ip, port: 8883, rejectUnauthorized: false, timeout: ms }, () => {
      const cn = sock.getPeerCertificate()?.subject?.CN || "";
      fim(/^[0-9A-Za-z]{12,18}$/.test(cn) ? cn : null);
    });
    sock.on("timeout", () => fim(null));
    sock.on("error", () => fim(null));
    setTimeout(() => fim(null), ms + 400);
  });
}

export async function descobrirBambuPorPorta(prefixos = sub_redes()) {
  const alvos = [];
  for (const p of prefixos) for (let i = 1; i < 255; i++) alvos.push(`${p}.${i}`);
  const achadas = [];
  let idx = 0;
  const trabalhador = async () => {
    while (idx < alvos.length) {
      const ip = alvos[idx++];
      const serial = await lerSerialBambu(ip);
      if (!serial) continue;
      const modelo = PREFIXO_SERIAL[serial.slice(0, 3)] || "";
      achadas.push({ chave: serial, tipo: "bambu_nuvem", ip, serial, nome: `Bambu ${modelo}`.trim(), modelo: `Bambulab ${modelo}`.trim() });
    }
  };
  await Promise.all(Array.from({ length: 64 }, trabalhador));
  return achadas;
}

// Elegoo (SDCP): broadcast "M99999" na porta UDP 3000; a impressora responde com um JSON.
export function descobrirElegoo(ms = 4000) {
  return new Promise((resolve) => {
    const achadas = new Map();
    const sock = dgram.createSocket("udp4");
    const fim = () => { try { sock.close(); } catch { /* ok */ } resolve([...achadas.values()]); };
    sock.on("error", fim);
    sock.on("message", (msg, rinfo) => {
      try {
        const d = JSON.parse(msg.toString()).Data || {};
        const id = d.MainboardID; if (!id) return;
        const ip = d.MainboardIP || rinfo.address;
        const maq = d.MachineName || "";
        achadas.set(id, { chave: `elegoo:${id}`, tipo: "elegoo_sdcp", ip, serial: String(id), nome: d.Name || maq || `Elegoo ${ip}`, modelo: /elegoo/i.test(maq) ? maq : `Elegoo ${maq}`.trim() });
      } catch { /* não é SDCP */ }
    });
    sock.bind(0, () => {
      try { sock.setBroadcast(true); } catch { /* ok */ }
      const alvos = new Set(["255.255.255.255"]);
      for (const p of sub_redes()) alvos.add(`${p}.255`);
      for (const a of alvos) { try { sock.send(Buffer.from("M99999"), 3000, a); } catch { /* ok */ } }
    });
    setTimeout(fim, ms);
  });
}
