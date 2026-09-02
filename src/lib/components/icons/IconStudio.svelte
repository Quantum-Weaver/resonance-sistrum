<script lang="ts">
  let { size = 20, color = 'currentColor' }: { size?: number; color?: string } = $props();
</script>
<!-- Three lanes, each with its own fader — the four-track's spirit in four strokes. -->
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M4 6h16" />
  <path d="M4 12h16" />
  <path d="M4 18h16" />
  <circle cx="9" cy="6" r="2" fill={color} />
  <circle cx="15" cy="12" r="2" fill={color} />
  <circle cx="7" cy="18" r="2" fill={color} />
</svg>
