<script lang="ts">
  let { size = 20, color = 'currentColor' }: { size?: number; color?: string } = $props();
</script>
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M3 15h18" />
  <path d="M6 15v-2" />
  <path d="M12 15v-3" />
  <path d="M18 15v-2" />
  <path d="M12 12 9.5 5" />
  <circle cx="12" cy="19" r="1.6" />
</svg>
