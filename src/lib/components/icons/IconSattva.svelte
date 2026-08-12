<script lang="ts">
  // The rounded square that breathes — the same shape the pacer draws,
  // so the door's icon and the door's contents are one gesture.
  let { size = 20, color = 'currentColor' }: { size?: number; color?: string } = $props();
</script>
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="4" y="4" width="16" height="16" rx="4" />
  <rect x="9" y="9" width="6" height="6" rx="2" opacity="0.5" />
</svg>
