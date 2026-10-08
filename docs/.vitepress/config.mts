import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'RxJS Deep Dive',
  description:
    'RxJS as a coherent algebra over streams: lineage, laws, time, Mealy machines, schedulers, subjects, and multicasting.',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Intro', link: '/intro' },
      { text: 'Modules', link: '/modules/module-01-lineage' }
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Home', link: '/' },
          { text: 'Intro & Syllabus', link: '/intro' }
        ]
      },
      {
        text: 'Course',
        items: [
          { text: '1. Origins & Lineage', link: '/modules/module-01-lineage' },
          {
            text: '2. Operators as Domain-Invariant Algebra',
            link: '/modules/module-02-domain-invariance'
          },
          { text: '3. The Operator Algebra', link: '/modules/module-03-operator-algebra' },
          { text: '4. Time Algebra', link: '/modules/module-04-time-algebra' },
          { text: '5. Operators as Mealy Machines', link: '/modules/module-05-mealy-machines' },
          { text: '6. Schedulers as the Clock', link: '/modules/module-06-schedulers' },
          { text: '7. Subjects: the Fork in the Dataflow', link: '/modules/module-07-subjects' },
          {
            text: '8. Multicasting = Subject + Lifecycle',
            link: '/modules/module-08-multicasting'
          }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/hansschenker/rxjs-deep-dive-kiro' }
    ],

    outline: 'deep'
  }
})
