

A very simple integration of seatable for NodeJS.


    const sea = new Seatable({token: SEATABLE_TOKEN })
    await sea.getBase( BASE_ID )
    let content = await sea.getTable( "Content" )
    let blog = await sea.getTable( "Blog" )