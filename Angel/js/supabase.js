// ==========================================
// CONFIGURACIÓN Y CONEXIÓN A SUPABASE
// ==========================================
const supabaseUrl = 'https://ixxxhuklvsxiqybzfpaw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4eHhodWtsdnN4aXF5YnpmcGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NDUyMjYsImV4cCI6MjA5NDEyMTIyNn0.hxeYgH8WrrEFK6aHpDSxKPi1APq5FSUQNH8T7twNpAc';

// Nombramos la variable "supabaseClient" para no chocar con la librería original
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

async function probarConexion() {
    console.log("Intentando conectar con la base de datos Supabase...");
    try {
        let { data, error } = await supabaseClient.from('Usuarios').select('*');
        if (error) {
            console.error("❌ Error de conexión:", error.message);
        } else {
            console.log("✅ ¡Conexión súper exitosa! Base de datos conectada.");
        }
    } catch (err) {
        console.error("❌ Ocurrió un problema técnico:", err);
    }
}

probarConexion();