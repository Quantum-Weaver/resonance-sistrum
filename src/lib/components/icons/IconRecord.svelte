<script lang="ts">
  let { size = 20, color = 'currentColor' }: { size?: number; color?: string } = $props();
</script>
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="9" y="2" width="6" height="12" rx="3" />
  <path d="M5 11a7 7 0 0 0 14 0" />
  <path d="M12 18v4" />
  <path d="M9 22h6" />
</svg>
