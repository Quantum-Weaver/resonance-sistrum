<script lang="ts">
  import IconHome from './IconHome.svelte';
  import IconInsights from './IconInsights.svelte';
  import IconSettings from './IconSettings.svelte';
  import IconTimer from './IconTimer.svelte';
  import IconSattva from './IconSattva.svelte';
  import IconRecord from './IconRecord.svelte';
  import IconTuner from './IconTuner.svelte';
  import IconMetronome from './IconMetronome.svelte';

  export type IconName =
    | 'home'
    | 'insights'
    | 'timer'
    | 'settings'
    | 'sattva'
    | 'record'
    | 'tuner'
    | 'metronome';

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
    'record': IconRecord,
    'tuner': IconTuner,
    'metronome': IconMetronome,
  };

  const Component = $derived(components[name]);
</script>

{#if Component}
  <Component {size} {color} />
{/if}
