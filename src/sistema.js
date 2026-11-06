// Integração com o Windows: iniciar junto com o computador e ficar escondido ao lado do relógio (bandeja),
// sem uma janela preta que dê para fechar sem querer.
import fs from "node:fs";
import path from "node:path";
import { spawn, execFile } from "node:child_process";
import { pastaDados, log } from "./config.js";

const NO_WINDOWS = process.platform === "win32";
const CHAVE_RUN = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
const NOME_RUN = "Brim3D Desktop";

// true quando estamos rodando o .exe do Brim3D Desktop (e não "node src/server.js" para desenvolvimento).
export const rodandoComoExe = () => NO_WINDOWS && /\.exe$/i.test(process.execPath) && !/[\\/](node|bun)\.exe$/i.test(process.execPath);

const reg = (args) => new Promise((resolve) => execFile("reg", args, { windowsHide: true }, (erro, stdout) => resolve({ ok: !erro, saida: String(stdout || "") })));

export async function iniciarComWindowsAtivo() {
  if (!rodandoComoExe()) return false;
  return (await reg(["query", CHAVE_RUN, "/v", NOME_RUN])).ok;
}

// Liga/desliga a abertura automática (sem precisar ser administrador: usa só a parte do usuário atual do Windows).
export async function definirIniciarComWindows(ativo) {
  if (!rodandoComoExe()) return { ok: false, erro: "Disponível só no programa instalado no Windows (.exe)." };
  const r = ativo
    ? await reg(["add", CHAVE_RUN, "/v", NOME_RUN, "/t", "REG_SZ", "/d", `"${process.execPath}" --segundo-plano`, "/f"])
    : await reg(["delete", CHAVE_RUN, "/v", NOME_RUN, "/f"]);
  // Apagar algo que já não existe não é erro.
  if (!r.ok && ativo) return { ok: false, erro: "O Windows não permitiu ligar o início automático." };
  log(`Início com o Windows: ${ativo ? "ligado" : "desligado"}.`);
  return { ok: true, ativo: !!ativo };
}

// Se o .exe mudou de pasta, atualiza o atalho de inicialização para o endereço novo.
export async function conferirInicioAutomatico() {
  try { if (await iniciarComWindowsAtivo()) await definirIniciarComWindows(true); } catch { /* sem problema */ }
}

// Esconde a janela preta quando ela é só nossa (o ideal é compilar com --windows-hide-console, que nem a cria).
export async function esconderJanelaPreta() {
  if (!NO_WINDOWS || typeof Bun === "undefined") return;
  try {
    const { dlopen, FFIType, ptr } = await import("bun:ffi");
    const k = dlopen("kernel32.dll", { GetConsoleWindow: { args: [], returns: FFIType.ptr }, GetConsoleProcessList: { args: [FFIType.ptr, FFIType.u32], returns: FFIType.u32 } });
    const u = dlopen("user32.dll", { ShowWindow: { args: [FFIType.ptr, FFIType.i32], returns: FFIType.bool } });
    const hwnd = k.symbols.GetConsoleWindow();
    const lista = new Uint32Array(8);
    const donos = k.symbols.GetConsoleProcessList(ptr(lista), 8);
    if (hwnd && donos <= 1) u.symbols.ShowWindow(hwnd, 0); // só esconde se nenhum outro programa (ex.: um terminal) usa esta janela
  } catch { /* sem FFI: segue com a janela */ }
}

// Quando o .exe é aberto com duplo clique, o Windows cria uma janela preta que, se fechada, derruba o programa.
// Para não depender disso, o programa se reabre sozinho SEM janela (processo solto) e a primeira cópia sai.
export function reabrirSemJanela(segundoPlano) {
  if (!rodandoComoExe() || process.argv.includes("--filho")) return false;
  try {
    const args = ["--filho"];
    if (segundoPlano) args.push("--segundo-plano");
    const p = spawn(process.execPath, args, { detached: true, windowsHide: true, stdio: "ignore", env: process.env });
    p.on("error", () => {});
    p.unref();
    return true;
  } catch (e) { log(`Não consegui reabrir em segundo plano: ${e.message}`); return false; }
}

const SCRIPT_BANDEJA = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$global:porta = $env:BRIM_PORTA
$global:token = $env:BRIM_TOKEN
$global:base = "http://127.0.0.1:" + $global:porta
$global:cab = @{ "x-fiscal-token" = $global:token }
$global:falhas = 0

# Ícone: quadrado laranja com a letra B
$bmp = New-Object System.Drawing.Bitmap 32, 32
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = "AntiAlias"
$g.Clear([System.Drawing.Color]::Transparent)
$g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(249, 115, 22))), 1, 1, 30, 30)
$fonte = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = "Center"; $fmt.LineAlignment = "Center"
$g.DrawString("B", $fonte, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF(0, 1, 32, 32)), $fmt)
$g.Dispose()
$global:ni = New-Object System.Windows.Forms.NotifyIcon
$global:ni.Icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$global:ni.Text = "Brim3D Desktop (rodando em segundo plano)"

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$mAbrir = $menu.Items.Add("Abrir o Brim3D Desktop")
$mAbrir.Font = New-Object System.Drawing.Font($mAbrir.Font, [System.Drawing.FontStyle]::Bold)
$mAuto = $menu.Items.Add("Iniciar com o Windows")
$mAuto.CheckOnClick = $false
$null = $menu.Items.Add("-")
$mSair = $menu.Items.Add("Sair (para de monitorar)")
$global:ni.ContextMenuStrip = $menu

function Abrir { Start-Process ($global:base) }
function Encerrar { $global:ni.Visible = $false; $global:ni.Dispose(); [System.Windows.Forms.Application]::Exit() }

$mAbrir.add_Click({ Abrir })
$global:ni.add_DoubleClick({ Abrir })
$menu.add_Opening({
  try {
    $r = Invoke-RestMethod -Uri ($global:base + "/sistema/estado") -Headers $global:cab -TimeoutSec 3
    $mAuto.Checked = [bool]$r.iniciarComWindows
  } catch { }
})
$mAuto.add_Click({
  try {
    $novo = -not $mAuto.Checked
    $corpo = (@{ ativo = $novo } | ConvertTo-Json)
    $r = Invoke-RestMethod -Uri ($global:base + "/sistema/iniciar-com-windows") -Method Post -Headers $global:cab -ContentType "application/json" -Body $corpo -TimeoutSec 5
    if ($r.ok) { $mAuto.Checked = $novo }
  } catch { }
})
$mSair.add_Click({
  $r = [System.Windows.Forms.MessageBox]::Show("Se sair, o Brim3D Desktop para de monitorar as impressoras e de emitir notas até ser aberto de novo. Sair mesmo?", "Brim3D Desktop", "YesNo", "Question")
  if ($r -eq "Yes") {
    try { Invoke-RestMethod -Uri ($global:base + "/sistema/sair") -Method Post -Headers $global:cab -ContentType "application/json" -Body "{}" -TimeoutSec 3 | Out-Null } catch { }
    Encerrar
  }
})

# Se o programa fechar por outro motivo, o ícone some sozinho.
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 5000
$timer.add_Tick({
  try { Invoke-RestMethod -Uri ($global:base + "/ping") -TimeoutSec 3 | Out-Null; $global:falhas = 0 }
  catch { $global:falhas++; if ($global:falhas -ge 3) { Encerrar } }
})
$timer.Start()

$global:ni.Visible = $true
if ($env:BRIM_AVISO -eq "1") {
  $global:ni.ShowBalloonTip(6000, "Brim3D Desktop", "Ele continua rodando aqui, ao lado do relogio. Clique no icone para abrir ou sair.", [System.Windows.Forms.ToolTipIcon]::Info)
}
[System.Windows.Forms.Application]::Run()
`;

let filho = null;

// Ícone ao lado do relógio (usa o PowerShell que já vem no Windows; não precisa instalar nada).
export function iniciarBandeja({ porta, token, aviso }) {
  if (!NO_WINDOWS || process.env.BRIM_SEM_BANDEJA) return;
  try {
    const arq = path.join(pastaDados(), "bandeja.ps1");
    fs.mkdirSync(pastaDados(), { recursive: true });
    fs.writeFileSync(arq, "﻿" + SCRIPT_BANDEJA, "utf8"); // BOM para o PowerShell ler os acentos
    let erros = "ignore";
    try { erros = fs.openSync(path.join(pastaDados(), "bandeja.log"), "w"); } catch { /* sem log */ }
    filho = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", arq], {
      windowsHide: true, stdio: ["ignore", "ignore", erros],
      env: { ...process.env, BRIM_PORTA: String(porta), BRIM_TOKEN: token, BRIM_AVISO: aviso ? "1" : "0" },
    });
    filho.on("error", (e) => log(`Bandeja não iniciou: ${e.message}`));
    filho.on("exit", () => { filho = null; });
  } catch (e) { log(`Bandeja não iniciou: ${e.message}`); }
}

export function fecharBandeja() { try { filho?.kill(); } catch { /* já fechou */ } }
