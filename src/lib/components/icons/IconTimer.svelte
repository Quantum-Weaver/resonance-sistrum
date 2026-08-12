<script lang="ts">
  let { size = 20, color = 'currentColor' }: { size?: number; color?: string } = $props();
</script>
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="12" cy="13" r="8" />
  <path d="M12 9v4l2.5 2.5" />
  <path d="M9 2h6" />
</svg>
