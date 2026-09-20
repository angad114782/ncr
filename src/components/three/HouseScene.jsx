import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, RoundedBox, Sparkles } from '@react-three/drei'
import { MathUtils } from 'three'

// A procedurally-built modern home (no model files to download): two volumes, glass,
// roof slabs, pool, lawn and trees. It reacts to the visitor:
//   • the house leans toward the cursor (pointer parallax)      • drag to orbit
//   • glowing hotspots grow and show a card on hover / tap      • day ↔ night lighting
// Lazy-loaded from HomeShowcase so three.js never blocks the first paint.

const C = {
  wall: '#f3ece2',
  wood: '#8b6a52',
  roof: '#3a2f28',
  glass: '#a9d4e8',
  lawn: '#7fae6b',
  stone: '#dccfbe',
  pool: '#4cc3df',
  trunk: '#6b4f3a',
  leaf: '#5d9a57',
  leafDark: '#4a8347',
}

// where each admin-editable hotspot sits on the model
const HOTSPOT_POSITIONS = [
  [-1.3, 1.05, 1.9], // living space
  [-1.3, 0.4, 3.4], // pool
  [4.0, 1.7, 0.4], // garden
  [0.4, 2.65, 1.6], // upper suite
]

function Tree({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.13, 1, 8]} />
        <meshStandardMaterial color={C.trunk} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <icosahedronGeometry args={[0.72, 1]} />
        <meshStandardMaterial color={C.leaf} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0.22, 1.95, 0.1]} castShadow>
        <icosahedronGeometry args={[0.48, 1]} />
        <meshStandardMaterial color={C.leafDark} roughness={0.85} flatShading />
      </mesh>
    </group>
  )
}

function Hotspot({ position, label, text, active, onSelect }) {
  const [hover, setHover] = useState(false)
  const ring = useRef()
  useFrame(({ clock }) => {
    if (!ring.current) return
    const t = (clock.elapsedTime * 0.9) % 1
    ring.current.scale.setScalar(1 + t * 1.8)
    ring.current.material.opacity = (1 - t) * 0.6
  })
  useEffect(() => () => { document.body.style.cursor = '' }, [])

  const on = hover || active
  return (
    <group position={position}>
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}
        onClick={(e) => { e.stopPropagation(); onSelect() }}
        scale={on ? 1.35 : 1}
      >
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshBasicMaterial color={on ? '#ffffff' : '#ffd08a'} toneMapped={false} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.15, 0.19, 32]} />
        <meshBasicMaterial color="#ffd08a" transparent toneMapped={false} depthWrite={false} />
      </mesh>
      {on && (
        <Html position={[0, 0.55, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
          <div className="glass-strong rounded-[16px] px-3.5 py-2.5 w-44 text-left shadow-xl">
            <p className="text-[13px] font-semibold leading-tight">{label}</p>
            {text && <p className="text-[11px] text-secondary leading-snug mt-0.5">{text}</p>}
          </div>
        </Html>
      )}
    </group>
  )
}

function House({ night, hotspots, reduced }) {
  const group = useRef()
  const mix = useRef(night ? 1 : 0) // 0 = day, 1 = night — eased so the switch fades
  const hemi = useRef()
  const sun = useRef()
  const glow = useRef([])
  const windows = useRef([])
  const [active, setActive] = useState(null)

  useFrame((state, delta) => {
    mix.current = MathUtils.damp(mix.current, night ? 1 : 0, 3.2, delta)
    const m = mix.current
    if (hemi.current) hemi.current.intensity = MathUtils.lerp(1.0, 0.32, m)
    if (sun.current) sun.current.intensity = MathUtils.lerp(2.1, 0.28, m)
    windows.current.forEach((mat) => mat && (mat.emissiveIntensity = MathUtils.lerp(0.04, 1.6, m)))
    glow.current.forEach((l) => l && (l.intensity = MathUtils.lerp(0, 7, m)))

    // lean toward the cursor (cursor event → pointer is normalised -1…1)
    if (group.current && !reduced) {
      group.current.rotation.y = MathUtils.damp(group.current.rotation.y, state.pointer.x * 0.22, 3, delta)
      group.current.rotation.x = MathUtils.damp(group.current.rotation.x, -state.pointer.y * 0.06, 3, delta)
    }
  })

  const win = (i) => (mat) => { windows.current[i] = mat }

  return (
    <group ref={group} onPointerMissed={() => setActive(null)}>
      {/* plinth + lawn */}
      <mesh position={[0, -0.16, 0]} receiveShadow>
        <cylinderGeometry args={[6.3, 6.5, 0.32, 72]} />
        <meshStandardMaterial color={C.stone} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[6.0, 6.0, 0.08, 72]} />
        <meshStandardMaterial color={C.lawn} roughness={1} />
      </mesh>

      {/* ground floor */}
      <RoundedBox args={[5.2, 1.7, 3.2]} radius={0.05} position={[-0.4, 0.94, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={C.wall} roughness={0.7} />
      </RoundedBox>
      {/* upper floor (timber clad) */}
      <RoundedBox args={[3.6, 1.5, 2.7]} radius={0.05} position={[0.4, 2.6, -0.05]} castShadow receiveShadow>
        <meshStandardMaterial color={C.wood} roughness={0.6} />
      </RoundedBox>
      {/* roof slabs */}
      <mesh position={[-0.55, 1.83, 0.15]} castShadow>
        <boxGeometry args={[5.7, 0.12, 3.6]} />
        <meshStandardMaterial color={C.roof} roughness={0.5} />
      </mesh>
      <mesh position={[0.4, 3.41, -0.05]} castShadow>
        <boxGeometry args={[4.0, 0.14, 3.1]} />
        <meshStandardMaterial color={C.roof} roughness={0.5} />
      </mesh>

      {/* glazing — warm emissive at night */}
      <mesh position={[-1.15, 0.95, 1.62]}>
        <boxGeometry args={[2.7, 1.25, 0.05]} />
        <meshStandardMaterial ref={win(0)} color={C.glass} metalness={0.4} roughness={0.08} transparent opacity={0.72} emissive="#ffc980" emissiveIntensity={0.04} />
      </mesh>
      <mesh position={[0.95, 0.95, 1.62]}>
        <boxGeometry args={[0.95, 1.25, 0.05]} />
        <meshStandardMaterial ref={win(1)} color={C.glass} metalness={0.4} roughness={0.08} transparent opacity={0.72} emissive="#ffc980" emissiveIntensity={0.04} />
      </mesh>
      <mesh position={[0.4, 2.6, 1.32]}>
        <boxGeometry args={[2.6, 0.95, 0.05]} />
        <meshStandardMaterial ref={win(2)} color={C.glass} metalness={0.4} roughness={0.08} transparent opacity={0.72} emissive="#ffc980" emissiveIntensity={0.04} />
      </mesh>
      <mesh position={[2.24, 0.95, 0.2]}>
        <boxGeometry args={[0.05, 1.1, 1.6]} />
        <meshStandardMaterial ref={win(3)} color={C.glass} metalness={0.4} roughness={0.08} transparent opacity={0.72} emissive="#ffc980" emissiveIntensity={0.04} />
      </mesh>
      {/* front door */}
      <mesh position={[1.85, 0.8, 1.62]}>
        <boxGeometry args={[0.7, 1.45, 0.07]} />
        <meshStandardMaterial color={C.wood} roughness={0.5} />
      </mesh>

      {/* interior glow */}
      <pointLight ref={(l) => { glow.current[0] = l }} position={[-1.1, 1, 0.8]} color="#ffb765" distance={6} decay={2} intensity={0} />
      <pointLight ref={(l) => { glow.current[1] = l }} position={[0.4, 2.5, 0.6]} color="#ffb765" distance={5} decay={2} intensity={0} />

      {/* pool, deck and path */}
      <mesh position={[-1.3, 0.07, 3.4]} receiveShadow>
        <boxGeometry args={[2.7, 0.06, 1.7]} />
        <meshStandardMaterial color={C.stone} roughness={0.9} />
      </mesh>
      <mesh position={[-1.3, 0.11, 3.4]}>
        <boxGeometry args={[2.3, 0.05, 1.3]} />
        <meshStandardMaterial color={C.pool} metalness={0.3} roughness={0.12} emissive="#2aa9c9" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[1.85, 0.07, 3.2]} receiveShadow>
        <boxGeometry args={[0.9, 0.05, 3.2]} />
        <meshStandardMaterial color={C.stone} roughness={0.9} />
      </mesh>

      {/* landscaping */}
      <Tree position={[-4.3, 0.05, -1.3]} scale={1.15} />
      <Tree position={[4.3, 0.05, -1.6]} scale={1.3} />
      <Tree position={[4.0, 0.05, 3.3]} scale={0.95} />
      <Tree position={[-4.6, 0.05, 3.1]} scale={0.85} />
      {[[-3.2, 0.3, 1.9], [-3.0, 0.28, 2.4], [2.9, 0.28, 2.0]].map((p, i) => (
        <mesh key={i} position={p} castShadow>
          <icosahedronGeometry args={[0.3, 1]} />
          <meshStandardMaterial color={C.leafDark} roughness={0.9} flatShading />
        </mesh>
      ))}

      {/* hotspots (labels editable in Admin → Site Content) */}
      {hotspots.slice(0, HOTSPOT_POSITIONS.length).map((h, i) => (
        <Hotspot
          key={i}
          position={HOTSPOT_POSITIONS[i]}
          label={h.label}
          text={h.text}
          active={active === i}
          onSelect={() => setActive((a) => (a === i ? null : i))}
        />
      ))}

      {/* lights */}
      <hemisphereLight ref={hemi} args={['#e8f1ff', '#b39a7a', 1]} />
      <directionalLight
        ref={sun}
        position={[7, 10, 6]}
        intensity={2.1}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0004}
      />
      {night && <Sparkles count={36} scale={[10, 4, 10]} position={[0, 2, 0]} size={3} speed={0.3} color="#ffd9a0" />}
    </group>
  )
}

// Vertical swipes must still scroll the page on phones; only sideways drags rotate the house.
function TouchScrollFix() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const id = requestAnimationFrame(() => { gl.domElement.style.touchAction = 'pan-y' })
    return () => cancelAnimationFrame(id)
  }, [gl])
  return null
}

export default function HouseScene({ night = false, active = true, hotspots = [], onReady }) {
  const [auto, setAuto] = useState(true)
  const timer = useRef()
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [8.6, 5.4, 10.4], fov: 36 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={() => onReady?.()}
    >
      <House night={night} hotspots={hotspots} reduced={reduced} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        target={[0, 1.4, 0.4]}
        minPolarAngle={Math.PI / 3.8}
        maxPolarAngle={Math.PI / 2.15}
        autoRotate={auto && !reduced}
        autoRotateSpeed={0.7}
        onStart={() => { clearTimeout(timer.current); setAuto(false) }}
        onEnd={() => { timer.current = setTimeout(() => setAuto(true), 2600) }}
      />
      <TouchScrollFix />
    </Canvas>
  )
}
