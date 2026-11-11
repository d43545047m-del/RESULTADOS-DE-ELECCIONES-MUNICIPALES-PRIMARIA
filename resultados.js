// URL directa exportada como CSV desde tu Google Sheet
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR_gJ1gJ54IEkOTwi0c2RFLEyxB1csqydki1HplYBHEY6ujGK7uYEqd7r1VjxKdu6JO_djDiAQbg_wA/pub?output=csv";

let resumenChartInstance = null;
let gradosChartInstance = null;
let listaGanadoraNombre = "Sin votos registrados";

// Normalización flexible para mapear exactamente las 5 listas activas
function normalizarNombreLista(votoOriginal) {
    if (!votoOriginal) return "";
    const texto = votoOriginal.toString().trim().toLowerCase();

    if (texto.includes("unión modelista") || texto.includes("lista 1")) return "Lista 1: Unión Modelista";
    if (texto.includes("triunfadores en acción") || texto.includes("lista 2")) return "Lista 2: Triunfadores en acción";
    if (texto.includes("manos unidas") || texto.includes("lista 3")) return "Lista 3: Manos unidas, huellas del futuro";
    if (texto.includes("estrellas unidas") || texto.includes("lista 4")) return "Lista 4: Estrellas unidas por el cambio";
    if (texto.includes("golden m") || texto.includes("lista 5")) return "Lista 5: Golden M - Voces brillantes";

    return "";
}

document.addEventListener("DOMContentLoaded", () => {
    cargarDatos();
});

async function cargarDatos() {
    const elemEstado = document.getElementById("estadoCarga");
    try {
        const response = await fetch(CSV_URL);
        if (!response.ok) throw new Error("No se pudo obtener el CSV");
        
        const csvText = await response.text();
        
        if (elemEstado) elemEstado.style.display = "none";

        const data = parseCSV(csvText);
        procesarYGraficar(data);
    } catch (error) {
        console.error("Error al cargar datos:", error);
        if (elemEstado) {
            elemEstado.innerText = "❌ Error al conectar con Google Sheets. Verifica tu conexión.";
            elemEstado.style.color = "#E74C3C";
        }
    }
}

// Lector y limpiador de CSV
function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length <= 1) return [];

    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].replace(/"/g, '').split(",");
        
        if (row.length >= 2) {
            const gradoVal = row[1] ? row[1].trim() : "No especificado";
            const votoBruto = row[2] ? row[2].trim() : (row[1] ? row[1].trim() : "");
            
            const votoVal = normalizarNombreLista(votoBruto);
            if (votoVal) {
                result.push({ grado: gradoVal, voto: votoVal });
            }
        }
    }
    return result;
}

function procesarYGraficar(data) {
    const conteoListas = {
        "Lista 1: Unión Modelista": 0,
        "Lista 2: Triunfadores en acción": 0,
        "Lista 3: Manos unidas, huellas del futuro": 0,
        "Lista 4: Estrellas unidas por el cambio": 0,
        "Lista 5: Golden M - Voces brillantes": 0
    };

    const conteoGrados = {};
    const todasLasListas = Object.keys(conteoListas);
    const todosLosGrados = ["Primero 1°", "Segundo 2°", "Tercero 3°", "Cuarto 4°", "Quinto 5°", "Sexto 6°"];

    data.forEach(item => {
        if (conteoListas.hasOwnProperty(item.voto)) {
            conteoListas[item.voto]++;
            if (!conteoGrados[item.grado]) conteoGrados[item.grado] = {};
            conteoGrados[item.grado][item.voto] = (conteoGrados[item.grado][item.voto] || 0) + 1;
        }
    });

    let maxVotos = 0;
    let ganadores = [];

    todasLasListas.forEach(lista => {
        const votos = conteoListas[lista];
        if (votos > maxVotos) {
            maxVotos = votos;
            ganadores = [lista];
        } else if (votos === maxVotos && votos > 0) {
            ganadores.push(lista);
        }
    });

    if (maxVotos === 0) {
        listaGanadoraNombre = "Sin votos registrados aún";
    } else if (ganadores.length === 1) {
        listaGanadoraNombre = `${ganadores[0]} (${maxVotos} votos)`;
    } else {
        listaGanadoraNombre = `🤝 Empate entre: ${ganadores.join(" / ")} (${maxVotos} votos c/u)`;
    }

    const paletaColores = ['#00AEEF', '#9B59B6', '#E74C3C', '#F1C40F', '#2ECC71'];

    // Gráfico 1: Conteo Total
    const ctxResumen = document.getElementById("resumenChart");
    if (ctxResumen) {
        if (resumenChartInstance) resumenChartInstance.destroy();
        resumenChartInstance = new Chart(ctxResumen.getContext("2d"), {
            type: 'bar',
            data: {
                labels: todasLasListas,
                datasets: [{
                    label: 'Total Votos',
                    data: todasLasListas.map(l => conteoListas[l]),
                    backgroundColor: paletaColores,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }

    // Gráfico 2: Participación por Grado
    const ctxGrados = document.getElementById("gradosChart");
    if (ctxGrados) {
        if (gradosChartInstance) gradosChartInstance.destroy();
        
        const datasetsGrados = todasLasListas.map((lista, index) => ({
            label: lista,
            data: todosLosGrados.map(g => (conteoGrados[g] && conteoGrados[g][lista]) ? conteoGrados[g][lista] : 0),
            backgroundColor: paletaColores[index],
            borderRadius: 6
        }));

        gradosChartInstance = new Chart(ctxGrados.getContext("2d"), {
            type: 'bar',
            data: { labels: todosLosGrados, datasets: datasetsGrados },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }
}

function mostrarGanador() {
    const elemWinner = document.getElementById("winnerName");
    const elemModal = document.getElementById("winnerModal");
    if (elemWinner) elemWinner.innerText = listaGanadoraNombre;
    if (elemModal) elemModal.style.display = "flex";
    if (typeof confetti === "function") confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
}

function cerrarGanador() {
    const elemModal = document.getElementById("winnerModal");
    if (elemModal) elemModal.style.display = "none";
}
