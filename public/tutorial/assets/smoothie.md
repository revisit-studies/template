# Your {{size}} smoothie

Made fresh at **{{shop}}**, blended with:

{{#each (lookupAnswersRel -1 'fruits')}}
- {{this}}
{{/each}}
