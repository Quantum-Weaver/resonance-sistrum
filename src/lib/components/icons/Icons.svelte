<script lang="ts">
  import IconHome from './IconHome.svelte';
  import IconInsights from './IconInsights.svelte';
  import IconSettings from './IconSettings.svelte';
  import IconTimer from './IconTimer.svelte';
  import IconSattva from './IconSattva.svelte';

  export type IconName = 'home' | 'insights' | 'timer' | 'settings' | 'sattva';

  let {
    name,
    size = 20,
    color = 'currentColor',
  }: {
    name: IconName;
    size?: number;
    color?: string;
  } = $props();

  const components: Record<IconName, any> = {
    'home': IconHome,
    'insights': IconInsights,
    'timer': IconTimer,
    'settings': IconSettings,
    'sattva': IconSattva,
  };

  const Component = $derived(components[name]);
</script>

{#if Component}
  <Component {size} {color} />
{/if}
