const sitePassword = process.env.SITE_PASSWORD || 'etsy2024';

const requireSiteAuth = (req, res, next) => {
    // Skip auth for login endpoints
    if (req.path.startsWith('/api/site-auth') || req.path.startsWith('/site-login.html')) {
        return next();
    }

    // Check if site password is provided
    const providedPassword = req.session.sitePassword || req.cookies.sitePassword;
    
    if (providedPassword === sitePassword) {
        return next();
    }

    // Redirect to site login
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ 
            error: 'Site authentication required',
            redirect: '/site-login.html'
        });
    }
    
    res.redirect('/site-login.html');
};

module.exports = {
    requireSiteAuth,
    sitePassword
};