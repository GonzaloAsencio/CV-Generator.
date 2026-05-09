# Checklist de Calidad — CV Tailor AI

Usar después de ejecutar `scripts/test-generations.ts`.  
Revisar manualmente una muestra de outputs generados.

---

## CV Harvard

### Datos personales
- [ ] Nombre, email, teléfono y ubicación copiados del CV original (no inventados)
- [ ] LinkedIn/GitHub presentes solo si estaban en el CV original

### Título y resumen
- [ ] Título coincide con el puesto de la oferta
- [ ] Resumen ≤ 600 caracteres
- [ ] Resumen menciona al menos 3 keywords de la oferta
- [ ] Resumen no contiene datos inventados

### Experiencia
- [ ] Experiencias ordenadas por relevancia al puesto (no necesariamente cronológico)
- [ ] Cada experiencia tiene título, empresa, ubicación, período y al menos 1 bullet
- [ ] Bullets usan verbos de acción (Desarrollé, Lideré, Reduje, Automaticé…)
- [ ] Bullets incluyen métricas o resultados concretos
- [ ] Sin información inventada sobre empleadores o logros

### Skills e idioma
- [ ] Technical skills incluyen tecnologías clave de la oferta
- [ ] Idioma del CV = idioma de la oferta

---

## Speech Técnico

### Obligatorio
- [ ] Menciona el nombre de la empresa explícitamente en el texto
- [ ] Menciona al menos una tecnología del tech stack de la empresa
- [ ] 4 secciones presentes y no vacías (introducción, motivación, técnica, propuesta)
- [ ] `full_text` es la concatenación coherente de las 4 secciones

### Calidad
- [ ] Tono natural, como si fuera hablado (sin jerga escrita o exceso de formalismo)
- [ ] `introduction`: presenta al candidato en 2-3 oraciones
- [ ] `motivation`: específica a la empresa y al rol, no genérica
- [ ] `technical_skills`: relacionadas directamente con la oferta concreta
- [ ] `value_proposition`: concreta — qué aportás, no solo "me entusiasma el puesto"
- [ ] `word_count` entre 350 y 450 palabras
- [ ] Sin información inventada

---

## Métricas de Retry

Ejecutar en **Supabase > SQL Editor** tras las pruebas:

```sql
SELECT
  kind,
  COUNT(*)                                                                   AS total,
  SUM(CASE WHEN retry_count > 0 THEN 1 ELSE 0 END)                         AS retried,
  ROUND(100.0 * SUM(CASE WHEN retry_count > 0 THEN 1 ELSE 0 END)
        / NULLIF(COUNT(*), 0), 1)                                           AS retry_pct,
  ROUND(AVG(latency_ms) / 1000.0, 1)                                       AS avg_latency_s
FROM llm_calls
WHERE created_at > NOW() - INTERVAL '2 hours'
GROUP BY kind;
```

---

## Resultado esperado

| Métrica              | Objetivo |
|----------------------|----------|
| CVs sin error        | ≥ 9/10   |
| Speeches sin error   | ≥ 7/8    |
| Retry rate CV        | < 5 %    |
| Retry rate Speech    | < 5 %    |
| Latencia promedio    | < 15 s   |
