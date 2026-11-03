// Descoberta de impressoras na rede local.
import dgram from "node:dgram";
import os from "node:os";
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
      try { sock.addMembership("239.255.255.250"); } catch { /* sem multicast */ }
      const busca = Buffer.from("M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1990\r\nMAN: \"ssdp:discover\"\r\nMX: 3\r\nST: urn:bambulab-com:device:3dprinter:1\r\n\r\n");
      try { sock.send(busca, 1990, "239.255.255.250"); } catch { /* ok */ }
    });
    setTimeout(fim, ms);
  });
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
