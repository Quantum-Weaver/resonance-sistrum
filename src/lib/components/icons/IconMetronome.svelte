<script lang="ts">
  let { size = 20, color = 'currentColor' }: { size?: number; color?: string } = $props();
</script>
<!-- The wedge and its arm. Time you can see. -->
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M9 3h6l4 18H5L9 3z" />
  <path d="M7 15h10" />
  <path d="M15.5 7 10 15" />
</svg>
