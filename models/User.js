const mongoose = require('mongoose');
const bcrypt = require('bcrypt.js');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 character long'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },

    email: {
        type: String,
        require: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address'],
    },

    password: {
        type: String,
        require: function(){
            return !this.googleId;
        },
        minlength: [8, "Password must be at least 8 character long"],
        select: false,
    },

    googleId: {
        type: String,
        sparse: true,
        index: true
    },

    avatar: {
        type: String,
        default: null
    },

    isVerified: {
        type: Boolean,
        default: true
    },
    
    preferences: {
        notifications: {
            type: Boolean,
            default: true
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'auto'
        },
        language: {
            type: String,
            default: 'en'
        }
    },

    lastLogin: {
        type: Date,
        default: Date.now
    },

    accountType: {
        type: String,
        enum: ['local', 'google'],
        require: true
    },

    stats: {
        totalUploads: {
            type: Number,
            default: 0
        },
        totalRecycled: {
            type: Number,
            default: 0
        },
        totalReused: {
            type: Number,
            default: 0
        },
        totalDonated: {
            type: Number,
            default: 0
        },
        carbonFootprintSaved: {
            type: Number,
            default: 0 
        }
    },

    timestamps: true,

    toJSON: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.__v;
            return ret;
        }
    }
    
});


userSchema.index({ email: 1});
userSchema.index({ googleId: 1});
userSchema.index({ createdAt: -1});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next()
    }

    try {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        this.password = await bcrypt.hash(this.password, saltRounds);
        next();     
    } catch (error) {
        next(error);
    }
});


userSchema.Schema.methods.comparePassword = async function (candidatePassword) {
    try {
        const userWithPassword = await this.construstor.findById(this._id).select('+password');

        if (!userWithPassword.password) {
            throw new Error("No password set for this user");
        }

        return await bcrypt.compare(candidatePassword, userWithPassword.password);

    } catch (error) {  
        throw error;
    }
}

userSchema.methods.updateStats = async function(action, carbonSaved = 0) {
    this.stats.totalUploads += 1;
    this.stats.carbonFootprintSaved += carbonSaved;
    
    switch(action) {
        case 'recycle':
        this.stats.totalRecycled += 1;
        break;
        case 'reuse':
        this.stats.totalReused += 1;
        break;
        case 'donate':
        this.stats.totalDonated += 1;
        break;
    }
    
    return await this.save();
};

userSchema.statics.getGlobalStats = async function() {
    const stats = await this.aggregate([
        {
        $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            totalUploads: { $sum: '$stats.totalUploads' },
            totalRecycled: { $sum: '$stats.totalRecycled' },
            totalReused: { $sum: '$stats.totalReused' },
            totalDonated: { $sum: '$stats.totalDonated' },
            totalCarbonSaved: { $sum: '$stats.carbonFootprintSaved' }
        }
        }
    ]);
    
    return stats[0] || {
        totalUsers: 0,
        totalUploads: 0,
        totalRecycled: 0,
        totalReused: 0,
        totalDonated: 0,
        totalCarbonSaved: 0
    };
};

userSchema.virtual('initials').get(function() {
    return this.name.split(' ').map(n => n[0]).join('').toUpperCase();
});

modules.export = mongoose.model('User', userSchema);