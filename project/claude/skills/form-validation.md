# Skill: Form Validation — Patrón del proyecto

Patrón de validación de formularios usado en este proyecto.
Implementado en el registro de jugadores. Aplicar igual en cualquier formulario nuevo.

---

## Principios

1. **Bloquear en tiempo real** — el carácter inválido nunca aparece en el campo
2. **Explicar con hint** — mensaje amarillo (`text-amber-400`) que desaparece en 2 segundos
3. **Error persistente** — mensaje rojo debajo del campo al salir (`onBlur`) o al intentar avanzar
4. **Nunca alert()** — todo inline, debajo del campo

---

## Hook reutilizable — `useFieldHint`

```js
const useFieldHint = () => {
  const [hint, setHint] = useState('')
  const timer = useRef(null)
  const show = useCallback((msg) => {
    setHint(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setHint(''), 2000)
  }, [])
  return [hint, show]
}
```

Pegar este hook dentro del componente del paso o en un archivo separado `src/hooks/useFieldHint.js`.

---

## Patrón de campo con bloqueo + hint

```jsx
const [dniHint, showDniHint] = useFieldHint()

// En el JSX:
<div>
  <Input
    label="DNI"
    name="dni"
    value={form.dni}
    onChange={(e) => {
      const raw = e.target.value
      const filtered = raw.replace(/[^\d]/g, '')       // solo dígitos
      if (raw !== filtered) showDniHint('El DNI solo acepta números')
      e.target.value = filtered
      handleChange(e)
      handleBlur('dni')                                 // valida en tiempo real
    }}
    onBlur={() => handleBlur('dni')}
    error={errors.dni}
  />
  {dniHint && <p className="text-amber-400 text-xs mt-1 animate-pulse">{dniHint}</p>}
</div>
```

---

## Reglas de filtrado por tipo de campo

| Campo | Filtro | Hint |
|---|---|---|
| Nombre / Apellido | `replace(/[0-9]/g, '')` | "no puede contener números" |
| DNI | `replace(/[^\d]/g, '')` | "solo acepta números" |
| Teléfono | Prefijo `+54 9` fijo, solo dígitos + espacios, máx 10 dígitos, check verde al completar | "Solo acepta números" / "El número debe tener 10 dígitos" |
| Email | sin filtro, validar formato con regex en tiempo real | "Ingresá un email válido" |
| Contraseña | sin filtro, validar largo y complejidad | mostrar `PasswordStrength` |

---

## Validaciones en `useRegisterForm.js`

```js
const validators = {
  nombre: (v) => {
    if (!v.trim()) return 'El nombre es requerido'
    if (v.trim().length < 2) return 'Mínimo 2 caracteres'
    if (/\d/.test(v)) return 'El nombre no puede contener números'
    return ''
  },
  dni: (v) => {
    if (!v) return 'El DNI es requerido'
    if (!/^\d+$/.test(v)) return 'El DNI solo puede contener números'
    if (v.length < 7 || v.length > 8) return 'El DNI debe tener 7 u 8 dígitos'
    return ''
  },
  password: (v) => {
    if (!v) return 'La contraseña es requerida'
    if (v.length < 8) return 'Mínimo 8 caracteres'
    return ''
  },
  confirmarPassword: (v, all) => {
    if (!v) return 'Confirmá la contraseña'
    if (v !== all.password) return 'Las contraseñas no coinciden'
    return ''
  },
}
```

---

## Validación en tiempo real para contraseñas

Pasar `handleBlur` dentro del `onChange` para que el error aparezca letra a letra:

```jsx
onChange={(e) => { handleChange(e); handleBlur('password') }}
```

---

## Archivos de referencia

- `src/hooks/useRegisterForm.js` — validators y lógica
- `src/features/player-register/Step1Basicos.jsx` — implementación completa
- `src/features/player-register/Step3Preferencias.jsx` — passwords + PasswordStrength
